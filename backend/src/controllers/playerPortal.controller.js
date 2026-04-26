const TournamentStage = require('../models/TournamentStage');
const TournamentGroup = require('../models/TournamentGroup');
const TournamentSlot = require('../models/TournamentSlot');
const TournamentResult = require('../models/TournamentResult');
const Tournament = require('../models/Tournament');
const mongoose = require('mongoose');

exports.getPublicRoadmap = async (req, res) => {
   try {
      const idOrShortCode = req.params.id;
      
      // Resolve ID
      let tournamentId = idOrShortCode;
      if (!mongoose.Types.ObjectId.isValid(idOrShortCode)) {
         const t = await Tournament.findOne({ shortCode: idOrShortCode }).select('_id').lean();
         if (!t) return res.status(404).json({ success: false, message: 'Tournament not found.' });
         tournamentId = t._id;
      }

      // 1. Fetch Stages (sorted by order)
      const stages = await TournamentStage.find({ tournamentId }).sort({ order: 1 }).lean();

      // 2. Fetch Groups
      const groups = await TournamentGroup.find({ tournamentId }).sort({ name: 1 }).lean();

      // 3. Fetch Slots
      const slots = await TournamentSlot.find({ tournamentId })
         .populate({
            path: 'occupyingTeam',
            select: 'name logo tag'
         }).lean();

      // 4. Fetch Results (Published only) and populate team names in standings
      const Team = require('../models/Team');
      const results = await TournamentResult.find({ tournamentId, status: { $ne: 'draft' } }).lean();

      // Collect all teamIds from standings to batch-populate
      const allTeamIds = new Set();
      results.forEach(r => {
        if (r.standings) r.standings.forEach(s => { if (s.teamId) allTeamIds.add(s.teamId.toString()); });
      });
      
      const teamMap = {};
      if (allTeamIds.size > 0) {
        const teams = await Team.find({ _id: { $in: [...allTeamIds] } }).select('name logo tag').lean();
        teams.forEach(t => { teamMap[t._id.toString()] = t; });
      }
      
      // Replace raw teamId with populated team object
      results.forEach(r => {
        if (r.standings) {
          r.standings = r.standings.map(s => ({
            ...s,
            teamId: teamMap[s.teamId?.toString()] || { _id: s.teamId, name: 'Unknown Team' }
          }));
        }
      });

      // Process Results to track promoted teams (so we can highlight them in the slots)
      const promotedTeamIds = new Set();
      results.forEach(result => {
         if (result.standings) {
            result.standings.forEach(s => {
               if (s.isQualifiedForNextStage) {
                  promotedTeamIds.add(s.teamId.toString());
               }
            });
         }
      });

      // Map slots to include isPromoted flag
      const processedSlots = slots.map(slot => {
         if (slot.occupyingTeam && promotedTeamIds.has(slot.occupyingTeam._id.toString())) {
            return { ...slot, isPromoted: true };
         }
         return slot;
      });

      res.json({
         success: true,
         data: {
            stages,
            groups,
            slots: processedSlots,
            results
         }
      });
   } catch (error) {
      console.error('[getPublicRoadmap]', error);
      res.status(500).json({ success: false, message: 'Failed to fetch public roadmap.' });
   }
};

exports.getGroupMatchRooms = async (req, res) => {
   try {
      const { id: tournamentId, groupId } = req.params;
      const TournamentRoomRelease = require('../models/TournamentRoomRelease');
      const TournamentRegistration = require('../models/TournamentRegistration');
      const TournamentSlot = require('../models/TournamentSlot');

      // Verify the user's team is actually in this group
      const reg = await TournamentRegistration.findOne({ tournamentId, userId: req.user._id });
      if (!reg) return res.status(403).json({ success: false, message: 'Not registered.' });

      const teamSlot = await TournamentSlot.findOne({ groupId, occupyingTeam: reg.teamId });
      if (!teamSlot) {
         return res.json({ success: true, data: [] }); // Not in this group — no rooms
      }

      const rooms = await TournamentRoomRelease.find({ tournamentId, groupId, isReleased: true }).sort('matchNumber');
      const matchRooms = rooms.map(r => ({
         matchNumber: r.matchNumber,
         roomId: r.roomId,
         roomPassword: r.roomPassword,
         mapName: r.mapName
      }));

      res.json({ success: true, data: matchRooms });
   } catch (error) {
      console.error('[getGroupMatchRooms]', error);
      res.status(500).json({ success: false, message: 'Failed to fetch match rooms.' });
   }
};

/**
 * GET /:id/chat-history
 * Fetch persisted tournament-wide (community) chat messages
 */
exports.getTournamentChatHistory = async (req, res) => {
   try {
      const TournamentChat = require('../models/TournamentChat');
      const messages = await TournamentChat.find({
         tournamentId: req.params.id,
         scope: 'tournament'
      })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('sender', 'username role avatar')
      .lean();

      const formatted = messages.map(m => ({
         _id: m._id,
         content: m.content,
         type: m.type,
         attachment: m.attachment,
         sender: m.sender,
         createdAt: m.createdAt,
      }));

      res.json({ success: true, data: formatted });
   } catch (error) {
      console.error('[getTournamentChatHistory]', error);
      res.status(500).json({ success: false, message: 'Failed to fetch chat history.' });
   }
};

/**
 * GET /:id/groups/:groupId/chat-history
 * Fetch persisted group chat messages
 */
exports.getGroupChatHistory = async (req, res) => {
   try {
      const TournamentChat = require('../models/TournamentChat');
      const messages = await TournamentChat.find({
         groupId: req.params.groupId,
         scope: 'group'
      })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('sender', 'username role avatar')
      .lean();

      const formatted = messages.map(m => ({
         _id: m._id,
         content: m.content,
         type: m.type,
         attachment: m.attachment,
         groupId: m.groupId,
         sender: m.sender,
         createdAt: m.createdAt,
      }));

      res.json({ success: true, data: formatted });
   } catch (error) {
      console.error('[getGroupChatHistory]', error);
      res.status(500).json({ success: false, message: 'Failed to fetch group chat history.' });
   }
};
