const User = require('../models/User');
const Scrim = require('../models/Scrim');
const Registration = require('../models/Registration');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');
const Withdrawal = require('../models/Withdrawal');
const { sendResponse } = require('../utils/response');

// @desc    Get high-level platform stats
// @route   GET /api/admin/stats
const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrganizers = await User.countDocuments({ role: 'organizer' });
    const totalScrims = await Scrim.countDocuments();
    const activeScrims = await Scrim.countDocuments({ status: { $in: ['published', 'live'] } });
    
    // Financial stats
    const transactions = await Transaction.find({ status: 'completed' });
    const totalVolume = transactions.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
    
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const openDisputes = await Dispute.countDocuments({ status: 'open' });

    // Growth data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersLastWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newScrimsLastWeek = await Scrim.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    sendResponse(res, 200, {
      overview: {
        totalUsers,
        totalOrganizers,
        totalScrims,
        activeScrims,
        totalVolume,
        pendingWithdrawals,
        openDisputes
      },
      growth: {
        newUsersLastWeek,
        newScrimsLastWeek
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity log
// @route   GET /api/admin/activity
const getRecentActivity = async (req, res, next) => {
  try {
    const recentRegistrations = await Registration.find()
      .populate('user', 'username')
      .populate('scrim', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentScrims = await Scrim.find()
      .populate('organizer', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    sendResponse(res, 200, {
      recentRegistrations,
      recentScrims
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlatformStats, getRecentActivity };
