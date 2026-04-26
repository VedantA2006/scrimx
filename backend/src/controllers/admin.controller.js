const User = require('../models/User');
const Scrim = require('../models/Scrim');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');
const Team = require('../models/Team');
const TournamentGroup = require('../models/TournamentGroup');
const TournamentSlot = require('../models/TournamentSlot');
const Registration = require('../models/Registration');
const mongoose = require('mongoose');

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    // Build search filter
    let filter = {};
    if (search && search.trim()) {
      const s = search.trim();
      filter = {
        $or: [
          { username: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { realName: { $regex: s, $options: 'i' } },
          { ign: { $regex: s, $options: 'i' } }
        ]
      };
    }

    const total = await User.countDocuments(filter);
    
    let users;
    if (limit === 'all') {
      users = await User.find(filter).select('-password').sort('-createdAt').lean();
    } else {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      users = await User.find(filter).select('-password').sort('-createdAt').skip(skip).limit(parseInt(limit)).lean();
    }
    
    // Batch-load ALL teams in one query, then build a userId → teamName map
    const allTeams = await Team.find().select('name tag captain members.user').lean();
    const userTeamMap = new Map();
    for (const team of allTeams) {
      // Map captain
      if (team.captain) userTeamMap.set(team.captain.toString(), team.name);
      // Map all members too
      if (team.members) {
        for (const m of team.members) {
          if (m.user) userTeamMap.set(m.user.toString(), team.name);
        }
      }
    }
    
    // Attach team names from the map (O(1) per user)
    for (const u of users) {
      u.teamName = userTeamMap.get(u._id.toString()) || null;
    }
    
    sendResponse(res, 200, {
      total,
      page: limit === 'all' ? 1 : parseInt(page),
      pages: limit === 'all' ? 1 : Math.ceil(total / parseInt(limit)),
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add balance to user wallet
// @route   PUT /api/admin/users/:id/balance
const addWalletBalance = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Please provide a valid amount to add', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update balance
    if (user.role === 'organizer') {
      await User.findByIdAndUpdate(user._id, {
        $inc: {
          'organizerProfile.pointsWallet.balance': Number(amount),
          'organizerProfile.pointsWallet.totalAdded': Number(amount)
        },
        $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
      });
      const updatedUser = await User.findById(user._id);

      await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount: Number(amount),
        status: 'completed',
        referenceId: `admin_deposit_${Date.now()}`,
        referenceModel: 'System',
        description: 'Funds added by Administrator to Points Wallet',
        balanceAfter: updatedUser.organizerProfile.pointsWallet.balance
      });
    } else {
      user.wallet.balance += Number(amount);
      await user.save();

      await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount: Number(amount),
        status: 'completed',
        referenceId: `admin_deposit_${Date.now()}`,
        referenceModel: 'System',
        description: 'Funds added by Administrator',
        balanceAfter: user.wallet.balance
      });
    }

    sendResponse(res, 200, {
      message: `Successfully added ${amount} to ${user.username}'s wallet.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or ban a user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'admin') {
      throw new AppError('Cannot delete another administrator', 403);
    }

    // Hard delete causes orphaned data (teams, registrations, disputes).
    // Instead, perform a soft delete to maintain data integrity.
    user.isActive = false;
    user.isBanned = true;
    await user.save();

    sendResponse(res, 200, {
      message: 'User deactivated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all scrims
// @route   GET /api/admin/scrims
const getAllScrims = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Scrim.countDocuments();
    const scrims = await Scrim.find()
      .populate('organizer', 'username organizerProfile.displayName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
      
    sendResponse(res, 200, {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: scrims.length,
      scrims
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a scrim
// @route   DELETE /api/admin/scrims/:id
const deleteScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    
    if (!scrim) {
      throw new AppError('Scrim not found', 404);
    }

    await Scrim.findByIdAndDelete(req.params.id);

    sendResponse(res, 200, {
      message: 'Scrim deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset a user's password (admin override)
// @route   PUT /api/admin/users/:id/reset-password
const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    // Use updateOne with a raw bcrypt hash to bypass the pre('save') hook (which would re-hash)
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
    sendResponse(res, 200, { message: `Password reset successfully for @${user.username}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Force join a user into a scrim or tournament
// @route   POST /api/admin/users/:id/force-join
const forceJoinEvent = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { eventType, inputCode } = req.body;

    if (!['scrim', 'tournament'].includes(eventType)) {
      throw new AppError('Invalid event type', 400);
    }
    if (!inputCode) {
      throw new AppError('Please provide an invite link or ID', 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Extract token if it's a URL
    let code = inputCode.trim();
    if (code.includes('join-invite/')) {
      code = code.split('join-invite/')[1].split('/')[0].split('?')[0];
    } else if (code.includes('/')) {
      code = code.split('/').pop().split('?')[0];
    }

    // Ensure user has a team
    let team = await Team.findOne({ captain: user._id });
    if (!team) {
      throw new AppError('User has no team. Ask them to create one first.', 400);
    }

    if (eventType === 'tournament') {
      let group = await TournamentGroup.findOne({ inviteToken: code })
        .populate('tournamentId', 'title game banner')
        .populate('stageId', 'name type stageCategory');

      let isMultiToken = false;
      let multiTokenEntry = null;

      if (!group) {
        group = await TournamentGroup.findOne({ 'multiInviteTokens.token': code })
          .populate('tournamentId', 'title game banner')
          .populate('stageId', 'name type stageCategory');
        if (group) {
          isMultiToken = true;
          multiTokenEntry = group.multiInviteTokens.find(t => t.token === code);
        }
      }

      if (!group) {
        // Fallback: Check if it's a root tournament shortCode
        const Tournament = require('../models/Tournament');
        const TournamentRegistration = require('../models/TournamentRegistration');
        const tournament = await Tournament.findOne({ shortCode: code });
        
        if (tournament) {
          const existingReg = await TournamentRegistration.findOne({ tournamentId: tournament._id, teamId: team._id });
          if (existingReg) throw new AppError('Team already registered for this tournament.', 400);
          
          await TournamentRegistration.create({
            tournamentId: tournament._id,
            teamId: team._id,
            userId: user._id,
            status: 'pending',
            paymentMode: 'free',
            termsAccepted: true,
            roster: team.members.map(m => ({
              playerId: m.user,
              inGameName: m.ign,
              inGameId: m.inGameId || 'UNKNOWN',
              role: m.role
            }))
          });
          return sendResponse(res, 200, { message: `Successfully registered ${user.username} into Tournament: ${tournament.title}` });
        }
        throw new AppError('Invalid tournament invite link/code.', 404);
      }

      const alreadySeeded = await TournamentSlot.findOne({ groupId: group._id, occupyingTeam: team._id });
      if (alreadySeeded) throw new AppError('Team is already in this tournament group.', 400);

      let targetSlot;
      if (isMultiToken && multiTokenEntry?.slotNumber) {
        targetSlot = await TournamentSlot.findOne({ groupId: group._id, slotNumber: multiTokenEntry.slotNumber, status: 'empty' });
      }
      if (!targetSlot) {
        targetSlot = await TournamentSlot.findOne({ groupId: group._id, status: 'empty' }).sort({ slotNumber: 1 });
      }
      if (!targetSlot) throw new AppError('No empty slots available in this tournament group.', 400);

      targetSlot.occupyingTeam = team._id;
      targetSlot.status = 'filled';
      await targetSlot.save();

      if (isMultiToken && multiTokenEntry) {
        multiTokenEntry.claimedByTeam = team._id;
        await group.save();
      }

      return sendResponse(res, 200, { message: `Successfully pushed ${user.username} into ${group.name}` });
    } else {
      // Scrim
      const scrim = await Scrim.findById(code);
      if (!scrim) throw new AppError('Scrim not found. Please provide a valid Scrim ID.', 404);

      const existing = await Registration.findOne({ scrim: scrim._id, team: team._id });
      if (existing) throw new AppError('Team already registered for this scrim.', 400);

      if (scrim.filledSlots >= scrim.slotCount) throw new AppError('All slots are filled in this scrim.', 400);

      await Registration.create({
        scrim: scrim._id,
        team: team._id,
        registeredBy: user._id,
        status: 'approved',
        slotNumber: scrim.filledSlots + 1,
        paymentStatus: 'unpaid',
        amountPaid: 0,
        originMethod: 'admin_force'
      });

      scrim.filledSlots += 1;
      scrim.registrationCount += 1;
      if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
      await scrim.save();

      return sendResponse(res, 200, { message: `Successfully pushed ${user.username} into Scrim: ${scrim.title}` });
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Bulk join multiple users into a scrim or tournament
// @route   POST /api/admin/bulk-force-join
const bulkForceJoinEvent = async (req, res, next) => {
  try {
    let { count, eventType, inputCode, userIds } = req.body;
    count = Number(count) || 0;
    
    console.log(`[BULK-JOIN] eventType=${eventType} code=${inputCode} userIds=${JSON.stringify(userIds)} count=${count}`);

    if (!['scrim', 'tournament'].includes(eventType)) {
      throw new AppError('Invalid event type', 400);
    }
    if (!inputCode) throw new AppError('Please provide an invite link or ID', 400);
    if (!userIds && (!count || count <= 0 || count > 50)) throw new AppError('Count must be between 1 and 50 if userIds are not provided', 400);

    // Extract token if it's a URL
    let code = inputCode.trim();
    if (code.includes('join-invite/')) {
      code = code.split('join-invite/')[1].split('/')[0].split('?')[0];
    } else if (code.includes('/')) {
      code = code.split('/').pop().split('?')[0];
    }

    let maxSlots = 0;
    let group = null;
    let scrim = null;
    let isMultiToken = false;
    let multiTokenEntry = null;

      let tournamentObj = null;

      if (eventType === 'tournament') {
        group = await TournamentGroup.findOne({ inviteToken: code })
          .populate('tournamentId', 'title game banner')
          .populate('stageId', 'name type stageCategory');

        if (!group) {
          group = await TournamentGroup.findOne({ 'multiInviteTokens.token': code })
            .populate('tournamentId', 'title game banner')
            .populate('stageId', 'name type stageCategory');
          if (group) {
            isMultiToken = true;
            multiTokenEntry = group.multiInviteTokens.find(t => t.token === code);
          }
        }

        if (!group) {
          const Tournament = require('../models/Tournament');
          tournamentObj = await Tournament.findOne({ shortCode: code });
          if (!tournamentObj) throw new AppError('Invalid tournament invite link/code.', 404);
          
          const TournamentRegistration = require('../models/TournamentRegistration');
          const filledCount = await TournamentRegistration.countDocuments({ tournamentId: tournamentObj._id, status: { $in: ['approved', 'pending', 'payment_verification'] } });
          const maxTeams = tournamentObj.participation?.maxTeams || tournamentObj.maxTeams || 100;
          maxSlots = Math.max(maxTeams - filledCount, userIds?.length || count || 50);
          console.log(`[BULK-JOIN] Tournament: ${tournamentObj.title}, maxTeams=${maxTeams}, filled=${filledCount}, maxSlots=${maxSlots}`);
        } else {
          const filledCount = await TournamentSlot.countDocuments({ groupId: group._id, status: 'filled' });
          const totalSlots = await TournamentSlot.countDocuments({ groupId: group._id });
          maxSlots = totalSlots - filledCount;
        }
      } else {
        scrim = await Scrim.findById(code);
        if (!scrim) throw new AppError('Scrim not found.', 404);
        maxSlots = scrim.slotCount - scrim.filledSlots;
      }

      if (maxSlots <= 0 && !userIds?.length) throw new AppError('Event is already full.', 400);
      if (maxSlots <= 0 && userIds?.length) maxSlots = userIds.length; // Admin force — override full check
      
      let targetUsers = [];
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        targetUsers = await User.find({ _id: { $in: userIds } }).select('_id username');
      } else {
        const allUsers = await User.find().select('_id username');
        targetUsers = allUsers.sort(() => 0.5 - Math.random());
      }
      
      // Cap the finalCount to maxSlots, and length if userIds provided
      const finalCount = userIds && userIds.length > 0 ? Math.min(targetUsers.length, maxSlots) : Math.min(count, maxSlots);

      let successCount = 0;

      for (const user of targetUsers) {
        if (successCount >= finalCount) break;

        const userId = user._id;
        let team = await Team.findOne({ captain: userId });
        if (!team) {
          // Fallback: check if user is a member of any team
          team = await Team.findOne({ 'members.user': userId });
        }
        if (!team) {
          console.log(`[DEBUG] No team found for user: ${user.username} (${user._id})`);
          continue;
        }

        console.log(`[DEBUG] Processing team ${team.name} for user ${user.username}`);

        try {
          if (eventType === 'tournament') {
            if (tournamentObj) {
              const TournamentRegistration = require('../models/TournamentRegistration');
              const existingReg = await TournamentRegistration.findOne({ tournamentId: tournamentObj._id, teamId: team._id });
              if (existingReg) {
                console.log(`[DEBUG] Team ${team.name} already registered in tournament`);
                continue;
              }
              
              await TournamentRegistration.create({
                tournamentId: tournamentObj._id,
                teamId: team._id,
                userId: user._id,
                status: 'pending',
                paymentMode: 'free',
                termsAccepted: true,
                roster: team.members.map(m => ({
                  playerId: m.user,
                  inGameName: m.ign || 'Unknown',
                  inGameId: m.inGameId || m.uid || 'UNKNOWN',
                  role: m.role
                }))
              });
              successCount++;
            } else {
              const alreadySeeded = await TournamentSlot.findOne({ groupId: group._id, occupyingTeam: team._id });
              if (alreadySeeded) {
                console.log(`[DEBUG] Team ${team.name} already seeded in slot`);
                continue;
              }

              let targetSlot;
              if (isMultiToken && multiTokenEntry?.slotNumber) {
                targetSlot = await TournamentSlot.findOne({ groupId: group._id, slotNumber: multiTokenEntry.slotNumber, status: 'empty' });
              }
              if (!targetSlot) {
                targetSlot = await TournamentSlot.findOne({ groupId: group._id, status: 'empty' }).sort({ slotNumber: 1 });
              }
              if (!targetSlot) continue;

              targetSlot.occupyingTeam = team._id;
              targetSlot.status = 'filled';
              await targetSlot.save();

              if (isMultiToken && multiTokenEntry) {
                multiTokenEntry.claimedByTeam = team._id;
                await group.save();
              }
              successCount++;
            }
          } else {
            // Scrim path
            const existing = await Registration.findOne({ scrim: scrim._id, team: team._id });
            if (existing) {
              console.log(`[DEBUG] Team ${team.name} already in scrim`);
              continue;
            }

            await Registration.create({
              scrim: scrim._id,
              team: team._id,
              registeredBy: user._id,
              status: 'approved',
              slotNumber: scrim.filledSlots + 1,
              paymentStatus: 'unpaid',
              amountPaid: 0,
              originMethod: 'admin_force'
            });

            scrim.filledSlots += 1;
            scrim.registrationCount = (scrim.registrationCount || 0) + 1;
            if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
            await scrim.save();

            console.log(`[DEBUG] ✅ Team ${team.name} successfully registered to scrim`);
            successCount++;
          }
        } catch (err) {
          console.error(`[DEBUG] Bulk join error for user ${user.username}:`, err.message);
        }
      }

    sendResponse(res, 200, { message: `Successfully pushed ${successCount} teams into the event.` });
  } catch (error) {
    next(error);
  }
};

// @desc    Grant Super Organizer status
// @route   PUT /api/admin/users/:id/super-organizer
const grantSuperOrganizer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'organizer') throw new AppError('User is not an organizer', 400);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isSuperOrganizer: true,
          'organizerProfile.isSuperOrganizer': true,
          'organizerProfile.organizerTier': 'super',
          'organizerProfile.superOrganizerGrantedAt': new Date(),
          'organizerProfile.superOrganizerGrantedBy': req.user._id,
          'organizerProfile.revenueSharePercent': 90,
          'organizerProfile.pointsWallet.balance': 99999
        }
      }
    );

    sendResponse(res, 200, { message: `Super Organizer granted to ${user.username}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke Super Organizer status
// @route   DELETE /api/admin/users/:id/super-organizer
const revokeSuperOrganizer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isSuperOrganizer: false,
          'organizerProfile.isSuperOrganizer': false,
          'organizerProfile.organizerTier': 'elite'
        }
      }
    );

    sendResponse(res, 200, { message: `Super Organizer revoked from ${user.username}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Set organizer tier manually
// @route   PUT /api/admin/users/:id/tier
const setOrganizerTier = async (req, res, next) => {
  try {
    const { tier } = req.body;
    const validTiers = ['starter', 'verified', 'pro', 'elite'];
    if (!validTiers.includes(tier)) throw new AppError('Invalid tier. Must be: starter, verified, pro, elite', 400);

    const revenueShareMap = { starter: 0, verified: 70, pro: 82, elite: 85 };

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'organizer') throw new AppError('User is not an organizer', 400);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'organizerProfile.organizerTier': tier,
          'organizerProfile.revenueSharePercent': revenueShareMap[tier],
          'organizerProfile.isVerified': tier !== 'starter'
        }
      }
    );

    sendResponse(res, 200, { message: `Tier set to ${tier} for ${user.username}` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  addWalletBalance,
  deleteUser,
  getAllScrims,
  deleteScrim,
  resetUserPassword,
  forceJoinEvent,
  bulkForceJoinEvent,
  grantSuperOrganizer,
  revokeSuperOrganizer,
  setOrganizerTier
};
