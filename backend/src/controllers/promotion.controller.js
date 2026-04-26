const Promotion = require('../models/Promotion');
const Scrim = require('../models/Scrim');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

const PROMO_PRICES = {
  highlight: 99, // Highlights card with neon border
  top_spot: 299, // Pins to top of marketplace
  homepage_banner: 999 // Large banner on landing page
};

// @desc    Buy promotion for a scrim
// @route   POST /api/promotions
const buyPromotion = async (req, res, next) => {
  try {
    const { scrimId, plan, durationDays = 1 } = req.body;

    if (!PROMO_PRICES[plan]) {
      throw new AppError('Invalid promotion plan', 400);
    }

    const cost = PROMO_PRICES[plan] * durationDays;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.organizer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    const user = await User.findById(req.user._id);
    if (user.wallet.balance < cost) {
      throw new AppError(`Insufficient balance. Costs ₹${cost}, but you have ₹${user.wallet.balance}`, 400);
    }

    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
      // Deduct wallet
      user.wallet.balance -= cost;
      user.wallet.totalSpent += cost;
      await user.save({ session });

      // Create transaction
      await Transaction.create([{
        user: user._id,
        type: 'fee',
        amount: -cost,
        status: 'completed',
        referenceId: scrimId,
        referenceModel: 'Scrim',
        description: `Purchased '${plan}' promotion for ${durationDays} days`,
        balanceAfter: user.wallet.balance
      }], { session });

      // Create or update promotion
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + durationDays);

      const promotion = await Promotion.create([{
        scrim: scrimId,
        organizer: req.user._id,
        plan,
        cost,
        startDate,
        endDate
      }], { session });

      // Update scrim flags
      if (plan === 'highlight') scrim.isHighlighted = true;
      if (plan === 'top_spot') scrim.isPinned = true;
      if (plan === 'homepage_banner') scrim.hasBanner = true;
      await scrim.save({ session });

      await session.commitTransaction();
      sendResponse(res, 201, { message: `Promotion activated for ${durationDays} days!`, promotion: promotion[0] });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get active promotions for a scrim
// @route   GET /api/promotions/scrim/:scrimId
const getScrimPromotions = async (req, res, next) => {
  try {
    const promotions = await Promotion.find({ 
      scrim: req.params.scrimId,
      status: 'active',
      endDate: { $gt: new Date() }
    });
    sendResponse(res, 200, { promotions });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active banners (For Homepage)
// @route   GET /api/promotions/banners
const getActiveBanners = async (req, res, next) => {
  try {
    const banners = await Promotion.find({
      plan: 'homepage_banner',
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('scrim', 'title date format entryFee minPrizePool organizer');

    sendResponse(res, 200, { banners });
  } catch (error) {
    next(error);
  }
};

module.exports = { buyPromotion, getScrimPromotions, getActiveBanners };
