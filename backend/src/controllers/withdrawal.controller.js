const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

// @desc    Request withdrawal
// @route   POST /api/withdrawals
const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, method, payoutDetails } = req.body;
    if (amount < 50) throw new AppError('Minimum withdrawal amount is ₹50', 400);

    const user = await User.findById(req.user._id);

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, 'organizerProfile.pointsWallet.balance': { $gte: amount } },
      {
        $inc: {
          'organizerProfile.pointsWallet.balance': -amount,
          'organizerProfile.pointsWallet.pendingBalance': amount
        },
        $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError(`Insufficient balance or concurrent transaction conflict.`, 400);
    }
    
    const pw = updatedUser.organizerProfile.pointsWallet;

    const withdrawal = await Withdrawal.create({
      user: req.user._id,
      amount,
      method,
      payoutDetails
    });

    // Create transaction record for audit trail
    await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount: -amount,
      status: 'pending',
      referenceId: withdrawal._id.toString(),
      referenceModel: 'Withdrawal',
      description: `Withdrawal request via ${method?.toUpperCase() || 'UPI'}`,
      balanceAfter: pw.balance
    });

    sendResponse(res, 201, { message: 'Withdrawal requested successfully', withdrawal });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user withdrawals
// @route   GET /api/withdrawals/my
const getMyWithdrawals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Withdrawal.countDocuments({ user: req.user._id });
    const withdrawals = await Withdrawal.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { withdrawals }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all withdrawals (Admin)
// @route   GET /api/withdrawals
const getAllWithdrawals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Withdrawal.countDocuments(query);
    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'username email role organizerProfile.displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { withdrawals }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process withdrawal (Admin)
// @route   PUT /api/withdrawals/:id/process
const processWithdrawal = async (req, res, next) => {
  try {
    const { status, transactionId, rejectionReason } = req.body;
    if (!['completed', 'rejected'].includes(status)) {
      throw new AppError('Invalid status update', 400);
    }

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) throw new AppError('Withdrawal not found', 404);
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      throw new AppError(`Cannot process withdrawal that is ${withdrawal.status}`, 400);
    }

    const user = await User.findById(withdrawal.user);

    if (status === 'completed') {
      if (!transactionId) throw new AppError('Transaction ID required for completed status', 400);

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, 'organizerProfile.pointsWallet.pendingBalance': { $gte: withdrawal.amount } },
        {
          $inc: {
            'organizerProfile.pointsWallet.pendingBalance': -withdrawal.amount,
            'organizerProfile.pointsWallet.totalWithdrawn': withdrawal.amount
          },
          $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
        },
        { new: true }
      );
      if (!updatedUser) throw new AppError('Conflict in pending balance update', 400);
      const pw = updatedUser.organizerProfile.pointsWallet;

      // Update the pending transaction record to completed
      await Transaction.findOneAndUpdate(
        { referenceId: withdrawal._id.toString(), type: 'withdrawal', status: 'pending' },
        { $set: { status: 'completed', balanceAfter: pw.balance } }
      );

      withdrawal.transactionId = transactionId;
    } else if (status === 'rejected') {
      if (!rejectionReason) throw new AppError('Rejection reason required', 400);

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, 'organizerProfile.pointsWallet.pendingBalance': { $gte: withdrawal.amount } },
        {
          $inc: {
            'organizerProfile.pointsWallet.pendingBalance': -withdrawal.amount,
            'organizerProfile.pointsWallet.balance': withdrawal.amount
          },
          $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
        },
        { new: true }
      );
      if (!updatedUser) throw new AppError('Conflict in pending balance update', 400);
      const pw = updatedUser.organizerProfile.pointsWallet;

      // Update the pending transaction record to rejected
      await Transaction.findOneAndUpdate(
        { referenceId: withdrawal._id.toString(), type: 'withdrawal', status: 'pending' },
        { $set: { status: 'rejected', balanceAfter: pw.balance } }
      );

      withdrawal.rejectionReason = rejectionReason;
    }

    withdrawal.status = status;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    await withdrawal.save();

    sendResponse(res, 200, { message: `Withdrawal ${status}`, withdrawal });
  } catch (error) {
    next(error);
  }
};

module.exports = { requestWithdrawal, getMyWithdrawals, getAllWithdrawals, processWithdrawal };
