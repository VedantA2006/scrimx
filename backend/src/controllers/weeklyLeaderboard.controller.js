const Result = require('../models/Result');
const Team = require('../models/Team');
const WeeklyLeaderboard = require('../models/WeeklyLeaderboard');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Get Monday 00:00:00 IST of the current week as a UTC Date.
 */
const getWeekStart = () => {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const day = istNow.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(istNow);
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  // Convert back to UTC
  return new Date(monday.getTime() - IST_OFFSET_MS);
};

/**
 * Get Saturday 23:59:59 IST as UTC Date.
 */
const getWeekEnd = (weekStart) => {
  // weekStart is Monday 00:00 IST in UTC
  // Saturday 23:59:59 IST = Monday + 5d 23h 59m 59s IST
  const end = new Date(weekStart.getTime() + (5 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000));
  return end;
};

/**
 * Build weekly leaderboard data from Results.
 */
const buildWeeklyData = async (weekStart, weekEnd) => {
  const results = await Result.find({
    status: 'finalized',
    createdAt: { $gte: weekStart, $lte: weekEnd }
  }).populate('scrim', '_id title');

  const teamMap = new Map();

  for (const result of results) {
    const scrimId = result.scrim?._id?.toString();
    if (!scrimId) continue;

    for (const standing of result.standings) {
      const teamId = standing.team?.toString();
      if (!teamId) continue;

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          teamId,
          weeklyPoints: 0,
          weeklyKills: 0,
          weeklyMatches: 0,
          weeklyPositionPoints: 0,
          scrimIds: new Set()
        });
      }

      const entry = teamMap.get(teamId);

      // Anti-cheat: count each scrim only once
      if (!entry.scrimIds.has(scrimId)) {
        entry.scrimIds.add(scrimId);
        entry.weeklyMatches += 1;
      }

      entry.weeklyPoints += standing.totalPoints || 0;
      entry.weeklyKills += standing.totalKillPoints || 0;
      entry.weeklyPositionPoints += standing.totalPositionPoints || 0;
    }
  }

  // Fetch team info
  const teamIds = Array.from(teamMap.keys());
  const teams = await Team.find({ _id: { $in: teamIds } }).select('name tag logo');
  const teamInfoMap = new Map();
  teams.forEach(t => teamInfoMap.set(t._id.toString(), t));

  // Build entries array
  const entries = [];
  for (const [teamId, data] of teamMap) {
    const teamInfo = teamInfoMap.get(teamId) || {};
    const killsPerMatch = data.weeklyMatches > 0 ? data.weeklyKills / data.weeklyMatches : 0;
    const meetsMinimum = data.weeklyMatches >= 3;
    const isFlagged = killsPerMatch > 25;
    const flagReason = isFlagged ? 'Abnormal kill rate — under review' : '';

    entries.push({
      team: teamId,
      teamName: teamInfo.name || 'Unknown',
      teamTag: teamInfo.tag || '',
      teamLogo: teamInfo.logo || '',
      weeklyPoints: data.weeklyPoints,
      weeklyKills: data.weeklyKills,
      weeklyMatches: data.weeklyMatches,
      weeklyPositionPoints: data.weeklyPositionPoints,
      meetsMinimum,
      isFlagged,
      flagReason,
      qualified: false,
      rank: 0
    });
  }

  // Sort by points DESC, then kills DESC
  entries.sort((a, b) => b.weeklyPoints - a.weeklyPoints || b.weeklyKills - a.weeklyKills);

  // Assign rank and qualification
  let qualifiedCount = 0;
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
    if (qualifiedCount < 16 && e.meetsMinimum && !e.isFlagged) {
      e.qualified = true;
      qualifiedCount++;
    }
  });

  return { entries, qualifiedCount };
};

// @desc    Get current weekly leaderboard
// @route   GET /api/weekly-leaderboard/current
const getCurrentWeeklyLeaderboard = async (req, res, next) => {
  try {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd(weekStart);

    const { entries, qualifiedCount } = await buildWeeklyData(weekStart, weekEnd);

    const now = new Date();
    const remaining = weekEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.floor(remaining / (24 * 60 * 60 * 1000)));
    const hoursRemaining = Math.max(0, Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
    const minutesRemaining = Math.max(0, Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)));

    sendResponse(res, 200, {
      weekStart,
      weekEnd,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      minimumMatchesRequired: 3,
      prizePool: 5000,
      entries,
      qualifiedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset weekly leaderboard (admin only)
// @route   POST /api/weekly-leaderboard/reset
const resetWeeklyLeaderboard = async (req, res, next) => {
  try {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd(weekStart);

    // Snapshot current data
    const { entries } = await buildWeeklyData(weekStart, weekEnd);

    const archivedWeek = await WeeklyLeaderboard.create({
      weekStart,
      weekEnd,
      status: 'closed',
      prizePool: 5000,
      entries: entries.slice(0, 50) // Archive top 50
    });

    // Reset all team weekly fields
    await Team.updateMany({}, {
      $set: {
        weeklyPoints: 0,
        weeklyKills: 0,
        weeklyMatches: 0,
        weeklyPositionPoints: 0,
        weeklyScrimIds: [],
        isWeeklyFlagged: false,
        weeklyFlagReason: '',
        weeklyQualified: false,
        weeklyLastReset: new Date()
      }
    });

    sendResponse(res, 200, {
      message: 'Weekly leaderboard reset. New week started.',
      archivedWeek
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly leaderboard history
// @route   GET /api/weekly-leaderboard/history
const getWeeklyLeaderboardHistory = async (req, res, next) => {
  try {
    const history = await WeeklyLeaderboard.find()
      .sort({ weekStart: -1 })
      .limit(10);

    sendResponse(res, 200, { history });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentWeeklyLeaderboard,
  resetWeeklyLeaderboard,
  getWeeklyLeaderboardHistory
};
