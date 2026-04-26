const crypto = require('crypto');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Get current plan details
// @route   GET /api/plans/current
// @access  Private/Organizer
exports.getCurrentPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    // Check if elite has expired
    let plan = user.organizerProfile?.plan || 'free';
    let subscription = user.organizerProfile?.subscription;

    if (plan === 'elite' && subscription?.endDate) {
      if (new Date() > new Date(subscription.endDate)) {
        // Expired
        user.organizerProfile.plan = 'free';
        user.organizerProfile.subscription.isActive = false;
        await user.save();
        plan = 'free';
        subscription = user.organizerProfile.subscription;
      }
    }

    sendResponse(res, 200, { plan, subscription });
  } catch (error) {
    next(error);
  }
};



// @desc    Purchase Elite Plan with Wallet
// @route   POST /api/plans/purchase-wallet
// @access  Private/Organizer
exports.purchaseWithWallet = async (req, res, next) => {
  try {
    const Transaction = require('../models/Transaction'); // Inline require
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    const amount = 999;

    const balance = user.organizerProfile?.pointsWallet?.balance || 0;
    // Check balance
    if (balance < amount) {
      throw new AppError('Insufficient wallet balance to purchase Elite plan', 400);
    }

    // Deduct amount
    await User.findByIdAndUpdate(user._id, {
      $inc: { 
        'organizerProfile.pointsWallet.balance': -amount,
        'organizerProfile.pointsWallet.totalUsed': amount 
      },
      $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
    });

    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: 'fee',
      amount: -amount, // Negative for deduction
      status: 'completed',
      referenceId: `elite_${Date.now()}`,
      referenceModel: 'Subscription',
      description: 'Purchased Elite Organizer Plan (30 Days)',
      balanceAfter: balance - amount
    });

    const updatedUser = await User.findById(user._id);

    // Upgrade profile to Elite
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days subscription

    updatedUser.organizerProfile.plan = 'elite';
    updatedUser.organizerProfile.subscription = {
      startDate,
      endDate,
      isActive: true
    };

    await updatedUser.save();

    sendResponse(res, 200, {
      message: 'Elite plan activated successfully via Wallet!',
      plan: updatedUser.organizerProfile.plan,
      subscription: updatedUser.organizerProfile.subscription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually grant elite plan (Admin)
// @route   POST /api/plans/admin/grant-elite
// @access  Private/Admin
exports.grantElitePlan = async (req, res, next) => {
  try {
    const { userId, durationDays } = req.body;
    if (!userId || !durationDays) throw new AppError('User ID and duration in days are required', 400);

    const user = await User.findById(userId);
    if (!user || user.role !== 'organizer') throw new AppError('Organizer not found', 404);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays));

    user.organizerProfile.plan = 'elite';
    user.organizerProfile.subscription = {
      startDate,
      endDate,
      isActive: true
    };

    await user.save();

    sendResponse(res, 200, {
      message: `Elite plan granted to ${user.username} for ${durationDays} days`,
      plan: user.organizerProfile.plan,
      subscription: user.organizerProfile.subscription
    });
  } catch (error) {
    next(error);
  }
};
