const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

// @desc    Get all users (admin)
// @route   GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { users }, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID (admin)
// @route   GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    sendResponse(res, 200, { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Ban/unban user (admin)
// @route   PUT /api/users/:id/ban
const toggleBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'admin') throw new AppError('Cannot ban admin', 400);

    user.isBanned = !user.isBanned;
    await user.save();

    sendResponse(res, 200, {
      message: user.isBanned ? 'User banned' : 'User unbanned',
      user
    });
  } catch (error) {
    next(error);
  }
};

const Registration = require('../models/Registration');
const Team = require('../models/Team');
const Scrim = require('../models/Scrim');

// @desc    Get dashboard stats for current player
// @route   GET /api/users/dashboard
const getPlayerDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all teams the user belongs to
    const myTeams = await Team.find({ 'members.user': userId, isActive: true }).select('_id');
    const teamIds = myTeams.map(t => t._id);

    // Registrations
    const registrations = await Registration.find({
      $or: [{ registeredBy: userId }, { team: { $in: teamIds } }]
    })
      .populate('scrim', 'title date startTime status game type banner')
      .populate('team', 'name tag')
      .sort({ createdAt: -1 });

    const totalRegistrations = registrations.length;

    const pendingSlots = registrations.filter(r => r.status === 'pending').length;

    // Team Count
    const teamsCount = myTeams.length;

    // Active Scrims
    const activeScrimsCount = registrations.filter(r => 
      r.scrim && ['published', 'live'].includes(r.scrim.status)
    ).length;

    // Upcoming Scrims (next 3)
    const upcomingScrims = registrations
      .filter(r => r.scrim && r.status === 'approved' && new Date(r.scrim.date) > new Date())
      .sort((a, b) => new Date(a.scrim.date) - new Date(b.scrim.date))
      .slice(0, 3)
      .map(r => r.scrim);

    const Transaction = require('../models/Transaction');

    // Registrations Activity
    const regActivity = registrations.map(r => ({
      _id: r._id,
      type: 'registration',
      title: `Registered for ${r.scrim?.title || 'Unknown Scrim'}`,
      date: r.createdAt,
      status: r.status
    }));

    // Transactions Activity
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5);
    const txActivity = transactions.map(t => ({
      _id: t._id,
      type: 'transaction',
      title: `${t.type === 'deposit' ? 'Added funds' : 'Transaction'}: ₹${t.amount}`,
      date: t.createdAt,
      status: t.status === 'completed' ? 'confirmed' : 'pending'
    }));

    // Combine & Sort Recent Activity
    const recentActivity = [...regActivity, ...txActivity]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    const mongoose = require('mongoose');
    const uId = new mongoose.Types.ObjectId(userId);
    const Result = require('../models/Result');

    // Kills aggregation
    const killStats = await Result.aggregate([
      { $match: { status: 'finalized' } },
      { $unwind: '$standings' },
      { $unwind: '$standings.matchScores' },
      { $unwind: '$standings.matchScores.playerKills' },
      { $match: { 'standings.matchScores.playerKills.userId': uId } },
      {
        $group: {
          _id: null,
          totalKills: { $sum: '$standings.matchScores.playerKills.kills' },
          scrims: { $addToSet: '$scrim' }
        }
      }
    ]);

    const totalKills = killStats[0]?.totalKills || 0;
    const totalScrims = killStats[0]?.scrims?.length || 0;

    // Finish stats
    const finishStats = await Result.aggregate([
      { $match: { status: 'finalized' } },
      { $unwind: '$standings' },
      { $match: { 'standings.team': { $in: teamIds } } },
      {
        $group: {
          _id: null,
          bestPlace: { $min: '$standings.place' },
          totalTopThree: { $sum: { $cond: [{ $lte: ['$standings.place', 3] }, 1, 0] } },
          totalWins: { $sum: { $cond: [{ $eq: ['$standings.place', 1] }, 1, 0] } }
        }
      }
    ]);

    const bestPlace = finishStats[0]?.bestPlace || null;
    const totalTopThree = finishStats[0]?.totalTopThree || 0;
    const totalWins = finishStats[0]?.totalWins || 0;

    sendResponse(res, 200, {
      stats: {
        activeScrims: activeScrimsCount,
        registrations: totalRegistrations,
        pendingSlots,
        teams: teamsCount,
        totalKills,
        totalScrims,
        bestPlace,
        totalTopThree,
        totalWins
      },
      upcomingScrims,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public player stats
// @route   GET /api/users/:userId/stats
const getPlayerStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');
    const uId = new mongoose.Types.ObjectId(userId);
    const Result = require('../models/Result');

    // Kills aggregation
    const killStats = await Result.aggregate([
      { $match: { status: 'finalized' } },
      { $unwind: '$standings' },
      { $unwind: '$standings.matchScores' },
      { $unwind: '$standings.matchScores.playerKills' },
      { $match: { 'standings.matchScores.playerKills.userId': uId } },
      {
        $group: {
          _id: null,
          totalKills: { $sum: '$standings.matchScores.playerKills.kills' },
          scrims: { $addToSet: '$scrim' }
        }
      }
    ]);

    const totalKills = killStats[0]?.totalKills || 0;
    const totalScrims = killStats[0]?.scrims?.length || 0;

    // Finish stats
    const myTeams = await Team.find({ 'members.user': uId }).select('_id name tag logo members');
    const teamIds = myTeams.map(t => t._id);

    const finishStats = await Result.aggregate([
      { $match: { status: 'finalized' } },
      { $unwind: '$standings' },
      { $match: { 'standings.team': { $in: teamIds } } },
      {
        $group: {
          _id: null,
          bestPlace: { $min: '$standings.place' },
          totalTopThree: { $sum: { $cond: [{ $lte: ['$standings.place', 3] }, 1, 0] } },
          totalWins: { $sum: { $cond: [{ $eq: ['$standings.place', 1] }, 1, 0] } }
        }
      }
    ]);

    const bestPlace = finishStats[0]?.bestPlace || null;
    const totalTopThree = finishStats[0]?.totalTopThree || 0;
    const totalWins = finishStats[0]?.totalWins || 0;

    // Format teams for the response
    const teams = myTeams.map(t => {
      const member = t.members.find(m => m.user.toString() === userId);
      return {
        _id: t._id,
        name: t.name,
        tag: t.tag,
        logo: t.logo,
        role: member ? member.role : 'player'
      };
    });

    sendResponse(res, 200, {
      stats: { totalKills, totalScrims, bestPlace, totalTopThree, totalWins },
      teams
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, toggleBan, getPlayerDashboard, getPlayerStats };
