const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

const UTR_REGEX = /^[a-zA-Z0-9]{12}$/;

// @desc  Request a wallet top-up (organiser sends UTR after paying admin via UPI)
// @route POST /api/wallet/request-topup
const requestTopup = async (req, res, next) => {
  try {
    const { amount, utr } = req.body;

    if (!amount || !Number.isInteger(Number(amount)) || Number(amount) < 10) {
      throw new AppError('Amount must be a positive integer >= 10', 400);
    }
    if (!utr || !UTR_REGEX.test(utr)) {
      throw new AppError('UTR must be exactly 12 alphanumeric characters', 400);
    }

    // Check for duplicate UTR
    const dup = await Transaction.findOne({ utr, type: 'topup' });
    if (dup) throw new AppError('This UTR has already been submitted', 400);

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'topup',
      amount: Number(amount),
      utr,
      status: 'pending',
      referenceId: utr,
      referenceModel: 'ManualUPI',
      description: `Wallet top-up request ₹${amount}`
    });

    // Notify admin via Telegram
    try {
      const telegramService = require('../services/telegram.service');
      await telegramService.sendTopupAlert(transaction, req.user);
    } catch (tgErr) {
      console.error('[Telegram topup alert]', tgErr.message);
    }

    sendResponse(res, 201, {
      message: 'Top-up request submitted. Admin will approve shortly.',
      transaction: {
        _id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        utr: transaction.utr,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get organiser wallet + recent transactions
// @route GET /api/wallet
const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('organizerProfile.pointsWallet');
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id, type: 'topup' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments({ user: req.user._id, type: 'topup' })
    ]);

    sendResponse(res, 200, {
      wallet: user.organizerProfile?.pointsWallet || { balance: 0 },
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get organiser balance only
// @route GET /api/wallet/balance
const getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('organizerProfile.pointsWallet');
    sendResponse(res, 200, {
      balance: user.organizerProfile?.pointsWallet?.balance || 0
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all transactions for this user (paginated)
// @route GET /api/wallet/transactions
const getTransactionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments({ user: req.user._id })
    ]);

    sendResponse(res, 200, {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get admin UPI ID (public config endpoint)
// @route GET /api/wallet/admin-upi
const getAdminUpi = async (req, res, next) => {
  try {
    sendResponse(res, 200, { upiId: process.env.ADMIN_UPI_ID || '' });
  } catch (error) {
    next(error);
  }
};

module.exports = { requestTopup, getWallet, getBalance, getTransactionHistory, getAdminUpi };
