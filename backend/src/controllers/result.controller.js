const mongoose = require('mongoose');
const Result = require('../models/Result');
const Scrim = require('../models/Scrim');
const Team = require('../models/Team');
const Registration = require('../models/Registration');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Submit/save scrim results (draft)
// @route   POST /api/results/scrim/:scrimId
const submitResults = async (req, res, next) => {
  try {
    let { standings, screenshotUrl, matchScreenshots } = req.body;
    const scrimId = req.params.scrimId;

    // Handle file uploads from Cloudinary
    if (req.files) {
      if (req.files.screenshot && req.files.screenshot[0]) {
        screenshotUrl = req.files.screenshot[0].path;
      }
      if (req.files.matchScreenshots && req.files.matchScreenshots.length > 0) {
        matchScreenshots = req.files.matchScreenshots.map(f => f.path);
      }
    }

    // Parse standings if sent as JSON string (multipart/form-data sends strings)
    if (typeof standings === 'string') {
      try { standings = JSON.parse(standings); } catch (e) { throw new AppError('Invalid standings format', 400); }
    }

    const scrim = await Scrim.findById(scrimId).populate('organizer');
    if (!scrim) throw new AppError('Scrim not found', 404);

    if (scrim.organizer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }


    const registeredTeams = await Registration.find({ scrim: scrimId, status: 'approved' }).select('team');
    const validTeamIds = registeredTeams.map(r => r.team.toString());

    const processedStandings = standings.map(s => {
      if (!validTeamIds.includes(String(s.teamId))) {
        throw new AppError(`Team ${s.teamId} is not approved for this scrim`, 400);
      }

      let totalPositionPoints = 0;
      let totalKillPoints = 0;

      const formattedMatchScores = (s.matchScores || []).map(ms => {
        const pPts = Number(ms.positionPoints) || 0;
        const playerKills = (ms.playerKills || []).map(pk => ({
          userId: pk.userId,
          ign: pk.ign || '',
          kills: Number(pk.kills) || 0
        }));
        const kPts = playerKills.reduce((sum, pk) => sum + pk.kills, 0);
        const total = pPts + kPts;
        totalPositionPoints += pPts;
        totalKillPoints += kPts;
        return { matchNumber: ms.matchNumber, positionPoints: pPts, killPoints: kPts, total, playerKills };
      });

      const totalPoints = totalPositionPoints + totalKillPoints;
      return { team: s.teamId, matchScores: formattedMatchScores, totalPositionPoints, totalKillPoints, totalPoints, prizeWon: 0 };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate actual prize pool based on filled slots (real money collected)
    const actualTotalPool = scrim.filledSlots * scrim.entryFee;
    const actualPlatformCut = actualTotalPool * ((scrim.platformFee || 7) / 100);
    const actualOrganizerCut = actualTotalPool * ((scrim.organizerCut || 0) / 100);
    const actualPrizePool = actualTotalPool - actualPlatformCut - actualOrganizerCut;

    processedStandings.forEach((s, idx) => {
      s.place = idx + 1;
      const prizeDist = scrim.prizeDistribution?.find(p => p.position === s.place);
      if (prizeDist) {
        // Calculate actual prize from percentage of real collected pool
        s.prizeWon = Math.round(actualPrizePool * (prizeDist.percentage / 100));
      }
    });

    const result = await Result.findOneAndUpdate(
      { scrim: scrimId },
      {
        scrim: scrimId,
        organizer: req.user._id,
        matchCount: scrim.matchCount,
        standings: processedStandings,
        screenshotUrl,
        matchScreenshots,
        status: 'draft'
      },
      { new: true, upsert: true }
    );

    sendResponse(res, 201, { message: 'Results saved', result });
  } catch (error) {
    next(error);
  }
};

// @desc    Pre-release results (visible to players for review)
// @route   PUT /api/results/scrim/:scrimId/pre-release
const preReleaseResults = async (req, res, next) => {
  try {
    const scrimId = req.params.scrimId;
    const result = await Result.findOne({ scrim: scrimId });
    if (!result) throw new AppError('Results not found. Please save them first.', 404);

    const scrim = await Scrim.findById(scrimId);
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    if (result.status === 'finalized') throw new AppError('Results are already finalized', 400);

    result.status = 'pre_released';
    await result.save();

    sendResponse(res, 200, { message: 'Results pre-released for player review', result });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm/finalize results and distribute prizes
// @route   PUT /api/results/scrim/:scrimId/publish
const publishResults = async (req, res, next) => {
  try {
    const scrimId = req.params.scrimId;
    const result = await Result.findOne({ scrim: scrimId }).populate('standings.team');

    if (!result) throw new AppError('Results not found', 404);
    if (result.status === 'finalized') throw new AppError('Results are already finalized', 400);

    const scrim = await Scrim.findById(scrimId);
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const standing of result.standings) {
        if (standing.prizeWon > 0) {
          const team = await Team.findById(standing.team._id).session(session);
          if (team) {
            const captain = await User.findById(team.captain).session(session);
            // Prize money is paid directly organiser → winner via UPI.
            // This record is for history only. No platform balance change.
            await Transaction.create([{
              user: captain._id, type: 'scrim_prize', amount: standing.prizeWon, status: 'completed',
              referenceId: scrimId, referenceModel: 'Scrim',
              description: `Prize record: ${scrim.title} (#${standing.place} Place) — ₹${standing.prizeWon}. Organiser pays directly via UPI.`,
              balanceAfter: captain.wallet.balance
            }], { session });
          }
        }

        const t = await Team.findById(standing.team._id).session(session);
        if (t) {
          t.totalScrims += 1;
          t.totalMatches = (t.totalMatches || 0) + (scrim.matchCount || 1);
          t.totalKills += standing.totalKillPoints;
          t.totalPoints += standing.totalPoints;
          t.seasonPoints += standing.totalPoints;
          if (standing.place === 1) t.wins += 1;
          await t.save({ session });
        }
      }

      scrim.status = 'completed';
      scrim.resultsPublished = true;
      await scrim.save({ session });

      result.status = 'finalized';
      result.publishedAt = new Date();
      await result.save({ session });

      await session.commitTransaction();

      // --- Post-commit: organizer rewards (outside transaction for safety) ---
      try {
        const { getOrganizerTierInfo } = require('../utils/organizerTier');
        const OrganizerPointTransaction = require('../models/OrganizerPointTransaction');
        const organizer = await User.findById(scrim.organizer);
        if (organizer && organizer.role === 'organizer') {
          // 1. Increment totalPlayersHosted
          const playersHosted = scrim.filledSlots || 0;
          await User.updateOne(
            { _id: organizer._id },
            { $inc: { 'organizerProfile.totalPlayersHosted': playersHosted } }
          );

          // 2. Activity reward: 5 credits if 8+ players
          if (playersHosted >= 8) {
            const bal = organizer.organizerProfile?.pointsWallet?.balance || 0;
            await User.updateOne(
              { _id: organizer._id },
              {
                $inc: { 'organizerProfile.pointsWallet.balance': 5, 'organizerProfile.pointsWallet.totalAdded': 5 },
                $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
              }
            );
            await OrganizerPointTransaction.create({
              organizer: organizer._id, type: 'credit', points: 5,
              balanceBefore: bal, balanceAfter: bal + 5,
              reason: `Activity reward: completed scrim with ${playersHosted} players`,
              relatedScrim: scrim._id
            });
          }

          // 3. Auto-promote tier (skip if Super Organizer)
          const freshOrg = await User.findById(organizer._id);
          if (!freshOrg.isSuperOrganizer) {
            const hosted = freshOrg.organizerProfile?.totalScrimsHosted || 0;
            const players = freshOrg.organizerProfile?.totalPlayersHosted || 0;
            const currentTier = freshOrg.organizerProfile?.organizerTier || 'starter';
            let newTier = 'starter';
            let newShare = 0;
            if (hosted >= 200 && players >= 3000) { newTier = 'pro'; newShare = 82; }
            else if (hosted >= 50 && players >= 500) { newTier = 'verified'; newShare = 70; }
            if (newTier !== currentTier && ['starter', 'verified'].includes(currentTier)) {
              await User.updateOne(
                { _id: freshOrg._id },
                {
                  $set: {
                    'organizerProfile.organizerTier': newTier,
                    'organizerProfile.revenueSharePercent': newShare,
                    'organizerProfile.isVerified': true
                  }
                }
              );
            }
          }

          // 4. Earnings summary for paid scrims
          if ((scrim.entryFee || 0) > 0) {
            const tierInfo = getOrganizerTierInfo(organizer);
            const totalPool = scrim.entryFee * (scrim.filledSlots || 0);
            const organizerShare = Math.round(totalPool * (tierInfo.revenueShare / 100));
            const platformShare = totalPool - organizerShare;
            await Scrim.findByIdAndUpdate(scrim._id, {
              $set: {
                'earningsSummary.totalPool': totalPool,
                'earningsSummary.organizerShare': organizerShare,
                'earningsSummary.platformShare': platformShare,
                'earningsSummary.calculatedAt': new Date()
              }
            });
          }
        }
      } catch (rewardErr) {
        console.error('Post-result organizer reward error:', rewardErr.message);
      }

      sendResponse(res, 200, { message: 'Results confirmed & prizes distributed!', result });
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

// @desc    Get scrim results
// @route   GET /api/results/scrim/:scrimId
const getResults = async (req, res, next) => {
  try {
    const result = await Result.findOne({ scrim: req.params.scrimId })
      .populate('standings.team', 'name tag logo');

    if (!result) throw new AppError('Results not found', 404);

    // Draft results are only visible to the organizer
    if (result.status === 'draft') {
      if (result.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new AppError('Results are not available yet', 403);
      }
    }
    
    // Pre-released results are visible to participants, organizer, and admin
    if (result.status === 'pre_released') {
      const myTeams = await Team.find({ 'members.user': req.user._id }).select('_id');
      const isParticipant = await Registration.exists({
        scrim: req.params.scrimId,
        team: { $in: myTeams.map(t => t._id) },
        status: 'approved'
      });
      const isOrganizer = result.organizer.toString() === req.user._id.toString();
      if (!isParticipant && !isOrganizer && req.user.role !== 'admin') {
        throw new AppError('Results not available yet', 403);
      }
    }

    sendResponse(res, 200, { result });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit dispute against pre-released results
// @route   POST /api/results/scrim/:scrimId/dispute
const submitDispute = async (req, res, next) => {
  try {
    const scrimId = req.params.scrimId;
    const { description } = req.body;
    if (!description || !description.trim()) throw new AppError('Please describe the issue', 400);

    const result = await Result.findOne({ scrim: scrimId });
    if (!result) throw new AppError('Results not found', 404);
    if (result.status !== 'pre_released') throw new AppError('Disputes can only be submitted during the review period', 400);

    const scrim = await Scrim.findById(scrimId);

    // Ensure user is part of a registered team
    const myTeams = await Team.find({ 'members.user': req.user._id, isActive: true }).select('_id');
    const teamIds = myTeams.map(t => t._id);
    const registration = await Registration.findOne({ scrim: scrimId, team: { $in: teamIds }, status: 'approved' });
    if (!registration) throw new AppError('You must be part of a registered team to submit a dispute', 403);

    const dispute = await Dispute.create({
      scrim: scrimId,
      raisedBy: req.user._id,
      against: scrim.organizer,
      reason: 'fake_results',
      description: description.trim(),
      status: 'open'
    });

    sendResponse(res, 201, { message: 'Dispute submitted. The organizer will review it.', dispute });
  } catch (error) {
    next(error);
  }
};

// @desc    Get disputes for a scrim (organizer)
// @route   GET /api/results/scrim/:scrimId/disputes
const getScrimDisputes = async (req, res, next) => {
  try {
    const scrimId = req.params.scrimId;
    const disputes = await Dispute.find({ scrim: scrimId })
      .populate('raisedBy', 'username avatar ign')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, { disputes });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global leaderboard
// @route   GET /api/results/leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const teams = await Team.find({ isActive: true })
      .select('name tag logo totalScrims totalMatches wins totalKills seasonPoints')
      .sort({ seasonPoints: -1, wins: -1, totalKills: -1 })
      .limit(parseInt(limit));

    sendResponse(res, 200, { leaderboard: teams });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global player kills leaderboard
// @route   GET /api/results/leaderboard/players
const getPlayerKillsLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const pipeline = [
      { $match: { status: 'finalized' } },
      { $unwind: '$standings' },
      { $unwind: '$standings.matchScores' },
      { $unwind: '$standings.matchScores.playerKills' },
      { $match: { 'standings.matchScores.playerKills.userId': { $ne: null } } },
      {
        $group: {
          _id: '$standings.matchScores.playerKills.userId',
          totalKills: { $sum: '$standings.matchScores.playerKills.kills' },
          scrims: { $addToSet: '$scrim' },
          ign: { $first: '$standings.matchScores.playerKills.ign' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          ign: { $cond: [{ $eq: ['$ign', ''] }, '$user.ign', '$ign'] },
          username: '$user.username',
          avatar: '$user.avatar',
          device: '$user.device',
          totalKills: 1,
          totalScrims: { $size: '$scrims' }
        }
      },
      { $sort: { totalKills: -1 } },
      { $limit: limit }
    ];

    const leaderboard = await Result.aggregate(pipeline);

    sendResponse(res, 200, { leaderboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my results
// @route   GET /api/results/my
const getMyResults = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Find teams user is in
    const myTeams = await Team.find({ 'members.user': userId }).select('_id');
    const teamIds = myTeams.map(t => t._id);
    
    const results = await Result.find({
      'standings.team': { $in: teamIds },
      status: { $in: ['pre_released', 'finalized'] }
    })
    .populate('scrim', 'title date startTime')
    .sort({ createdAt: -1 })
    .limit(20);

    const formatted = results.map(r => {
      const standing = r.standings.find(s => teamIds.some(id => id.equals(s.team)));
      const myKills = (standing?.matchScores || [])
        .flatMap(ms => ms.playerKills || [])
        .filter(pk => pk.userId && pk.userId.equals(userId))
        .reduce((sum, pk) => sum + pk.kills, 0);
      return {
        scrimId: r.scrim?._id,
        scrimTitle: r.scrim?.title,
        scrimDate: r.scrim?.date,
        teamPlace: standing?.place,
        myKills,
        totalPoints: standing?.totalPoints,
        prizeWon: standing?.prizeWon || 0,
        status: r.status
      };
    });

    sendResponse(res, 200, { results: formatted });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitResults, preReleaseResults, publishResults, getResults, getLeaderboard, submitDispute, getScrimDisputes, getPlayerKillsLeaderboard, getMyResults };
