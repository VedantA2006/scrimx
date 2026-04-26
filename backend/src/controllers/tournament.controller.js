const Tournament = require('../models/Tournament');

exports.createTournament = async (req, res) => {
  try {
    const { title, game, format, mode, entryFee, prizePool, maxTeams, description, teamsPerGroup, tournamentStartDate } = req.body;
    
    // Explicitly enforce DRAFT state on creation
    const tournament = await Tournament.create({
      organizer: req.user._id,
      title,
      game,
      format,
      mode,
      entryFee: Number(entryFee) || 0,
      prizePool: Number(prizePool) || 0,
      maxTeams: Number(maxTeams),
      teamsPerGroup: Number(teamsPerGroup) || 20,
      tournamentStartDate: tournamentStartDate ? new Date(tournamentStartDate) : undefined,
      description,
      status: 'draft' // Phase 1: Explicit Container Locking
    });

    res.status(201).json({ success: true, data: tournament, message: 'Tournament created successfully!' });
  } catch (error) {
    console.error('createTournament error:', error);
    res.status(500).json({ success: false, message: 'Failed to create tournament. Please check your inputs.' });
  }
};

// Banner-only upload endpoint — returns Cloudinary URL to store in formData client side
exports.uploadTournamentBanner = async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });
      const url = req.file.path; // Cloudinary returns the hosted URL in req.file.path
      res.json({ success: true, url, message: 'Banner uploaded successfully.' });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Banner upload failed.' });
   }
};

exports.uploadProof = async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });
      const url = req.file.path; // Cloudinary returns the hosted URL in req.file.path
      res.json({ success: true, url, message: 'Proof uploaded successfully.' });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Proof upload failed.' });
   }
};

const TournamentRuleSet = require('../models/TournamentRuleSet');
const TournamentPrizeConfig = require('../models/TournamentPrizeConfig');

exports.createEnterpriseTournament = async (req, res) => {
  try {
    const payload = req.body;
    
    // Sanitize schedule: replace empty string dates with undefined so Mongoose doesn't try to parse them
    const schedule = {};
    const dateFields = ['registrationOpen', 'registrationClose', 'checkInOpen', 'checkInClose', 'matchStartDate', 'reportingDeadline', 'resultVerificationDeadline', 'prizePayoutDate'];
    dateFields.forEach(f => {
      if (payload.schedule?.[f]) schedule[f] = new Date(payload.schedule[f]);
    });
    if (payload.schedule?.timezone) schedule.timezone = payload.schedule.timezone;
    if (payload.schedule?.isMultiDay !== undefined) schedule.isMultiDay = payload.schedule.isMultiDay;
    if (payload.schedule?.numberOfDays) schedule.numberOfDays = payload.schedule.numberOfDays;

    // 1. Save the overarching Tournament
    const tournament = await Tournament.create({
      organizer: req.user._id,
      title: payload.title,
      subtitle: payload.subtitle,
      shortDescription: payload.shortDescription,
      game: payload.game,
      tournamentType: payload.tournamentType,
      format: payload.format,
      mode: payload.mode,
      region: payload.region,
      platformType: payload.platformType,
      visibility: payload.visibility,
      status: 'draft',
      schedule,
      participation: payload.participation,
      finance: payload.finance,
      operations: payload.operations,
      socialRequirements: payload.socialRequirements
    });

    // 2. Extrapolate and save strict Rules Engine
    // allowedDevices must be an array — wrap if string
    const allowedDevicesRaw = payload.rules?.allowedDevices;
    const allowedDevices = Array.isArray(allowedDevicesRaw)
      ? allowedDevicesRaw
      : allowedDevicesRaw ? [allowedDevicesRaw] : ['Mobile'];

    const ruleSet = await TournamentRuleSet.create({
      tournamentId: tournament._id,
      eligibility: {
         minAccountLevel: payload.rules?.minAccountLevel || 0,
         allowedDevices
      },
      policies: {
         bannedBehavior: payload.rules?.bannedBehavior || 'Standard anti-cheat applies.',
         vpnAllowed: payload.rules?.vpnAllowed || false,
         lateJoinPenalty: payload.rules?.lateJoinPenalty || 'Disqualification',
         noShowPolicy: payload.rules?.noShowPolicy || 'Zero points'
      }
    });

    // 3. Extrapolate Base Prize Config Shell (Admins can populate later)
    const prizeConfig = await TournamentPrizeConfig.create({
      tournamentId: tournament._id,
      positionDeltas: [] // Explicitly blank on creation; edit via Dashboard
    });

    // 4. Link Relational Engines
    tournament.rulesEngineId = ruleSet._id;
    await tournament.save();

    res.status(201).json({ success: true, data: tournament._id, message: 'Enterprise Architecture generated!' });
  } catch (error) {
    console.error('createEnterpriseTournament error:', error.message);
    if (error.errors) {
      Object.entries(error.errors).forEach(([k, v]) => console.error(`  Validation fail — ${k}: ${v.message}`));
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to construct enterprise models.' });
  }
};

const TournamentStage = require('../models/TournamentStage');
const TournamentGroup = require('../models/TournamentGroup');
const TournamentSlot = require('../models/TournamentSlot');
const TournamentRegistration = require('../models/TournamentRegistration');
const ScoringProfile = require('../models/ScoringProfile');

exports.generateScaffolding = async (req, res) => {
  try {
    // Allow admin users to scaffold any tournament; organizers can only scaffold their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, organizer: req.user._id };
    const tournament = await Tournament.findOne(query);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found or access denied' });

    // Accept teamsPerGroup from request body (UI input), fall back to tournament config
    const teamsPerGroup = parseInt(req.body.teamsPerGroup) || tournament.participation?.teamsPerGroup || tournament.teamsPerGroup || 20;
    const maxTeams = tournament.participation?.maxTeams || tournament.maxTeams || 100;

    if (teamsPerGroup < 2 || teamsPerGroup > maxTeams) {
      return res.status(400).json({ success: false, message: `Teams per group must be between 2 and ${maxTeams}.` });
    }

    const groupCount = Math.ceil(maxTeams / teamsPerGroup);

    // Wipe existing scaffolding so organizer can re-generate with new grouping
    const existingGroups = await TournamentGroup.find({ tournamentId: tournament._id });
    if (existingGroups.length > 0) {
      await TournamentSlot.deleteMany({ tournamentId: tournament._id });
      await TournamentGroup.deleteMany({ tournamentId: tournament._id });
      await TournamentStage.deleteMany({ tournamentId: tournament._id });
      // Reset any previously seeded teams back to approved so re-seeding works
      await TournamentRegistration.updateMany(
        { tournamentId: tournament._id, status: 'checked-in' },
        { $set: { status: 'approved' } }
      );
    }

    // Create/update the ScoringProfile if it doesn't exist
    const existingProfile = await ScoringProfile.findOne({ tournamentId: tournament._id });
    if (!existingProfile) {
      const profile = await ScoringProfile.create({ tournamentId: tournament._id });
      tournament.scoringProfile = profile._id;
      await tournament.save();
    }

    // Generate Stage (Round 1)
    const stage = await TournamentStage.create({
      tournamentId: tournament._id,
      name: 'Round 1 - Qualifiers',
      order: 1
    });

    // Generate Groups and their empty Slots
    const groupPromises = [];
    for (let i = 0; i < groupCount; i++) {
       const groupName = `Group ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i/26) : ''}`;
       
       const groupPromise = TournamentGroup.create({
         tournamentId: tournament._id,
         stageId: stage._id,
         name: groupName,
         teamsLimit: teamsPerGroup
       }).then(async (group) => {
          const slotDocs = [];
          for (let s = 1; s <= teamsPerGroup; s++) {
             slotDocs.push({ tournamentId: tournament._id, groupId: group._id, slotNumber: s, status: 'empty' });
          }
          await TournamentSlot.insertMany(slotDocs);
       });

       groupPromises.push(groupPromise);
    }
    
    await Promise.all(groupPromises);

    res.json({ success: true, message: `Created ${groupCount} groups of ${teamsPerGroup} teams each (${maxTeams} total slots).` });
  } catch (error) {
    console.error('generateScaffolding error:', error);
    res.status(500).json({ success: false, message: 'Infrastructure generation failed. See logs.' });
  }
};

exports.getMyTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: tournaments });
  } catch (error) {
    console.error('getMyTournaments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
  }
};

// Phase 5: Fast In-Memory Cache Proxy
let GlobalTournamentCache = { data: null, timestamp: 0 };
const CACHE_TTL = 30000; // 30 seconds

exports.publishTournament = async (req, res) => {
    try {
      const tournament = await Tournament.findOne({ _id: req.params.id, organizer: req.user._id });
      if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
  
      // Sanity Checks before moving to Published
      if (!tournament.schedule || !tournament.schedule.matchStartDate) {
        return res.status(400).json({ success: false, message: 'Missing Match Start Date in Schedule.' });
      }
      
      if (!tournament.participation || !tournament.participation.maxTeams) {
        return res.status(400).json({ success: false, message: 'Missing Maximum Team Limits.' });
      }
  
      tournament.status = 'published';

      // Auto-open registrations if the open date has already passed
      if (tournament.schedule.registrationOpen && new Date(tournament.schedule.registrationOpen) <= new Date()) {
         tournament.status = 'registrations_open';
      }

      await tournament.save();
  
      res.json({ success: true, message: 'Tournament has been published to the global ledger!', data: tournament });
    } catch (error) {
      console.error('publishTournament error:', error);
      res.status(500).json({ success: false, message: 'Encountered error publishing the tournament.' });
    }
  };
  
exports.bulkApproveRegistrations = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        const maxLimit = tournament.participation?.maxTeams || tournament.maxTeams || 100;

        const pendingRegs = await TournamentRegistration.find({ tournamentId: req.params.id, status: 'pending' }).sort({ createdAt: 1 });
        let currentApproved = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'approved' });
        let currentWaitlistCount = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'waitlist' });

        let approvedCount = 0;
        let waitlistedCount = 0;

        for (const reg of pendingRegs) {
            let nextStatus = 'approved';
            
            if (currentApproved >= maxLimit) {
                nextStatus = 'waitlist';
            }

            if (nextStatus === 'approved') {
                reg.status = 'approved';
                currentApproved++;
                approvedCount++;
            } else {
                reg.status = 'waitlist';
                reg.waitlistRank = currentWaitlistCount + 1;
                reg.organizerNotes = 'Auto-Overflowed during Bulk Action';
                currentWaitlistCount++;
                waitlistedCount++;
            }
            await reg.save();
        }

        await TournamentAuditLog.create({
            tournamentId: req.params.id,
            actorId: req.user._id,
            action: 'BULK_APPROVE_PENDING',
            reason: `Mass parsed ${pendingRegs.length} squads. Approved: ${approvedCount}, Overflowed to Priority Waitlist: ${waitlistedCount}`
        });

        res.json({ success: true, message: `Action complete. ${approvedCount} approved, ${waitlistedCount} waitlisted.` });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Bulk approval action failed.' });
    }
};

exports.bulkDeleteRegistrations = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;
        
        // Delete all registrations for this tournament
        const TournamentRegistration = require('../models/TournamentRegistration');
        const deletedResult = await TournamentRegistration.deleteMany({ tournamentId });
        
        // Also clean up any slots occupied by these teams? 
        // This is safer to ensure no phantom slots remain if teams are fully removed.
        const TournamentSlot = require('../models/TournamentSlot');
        await TournamentSlot.updateMany(
           { tournamentId, occupyingTeam: { $ne: null } },
           { $set: { occupyingTeam: null, status: 'empty', assignedAt: null } }
        );

        res.json({ success: true, message: `Successfully removed all ${deletedResult.deletedCount} teams from the tournament and cleared slots.` });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Failed to bulk delete registrations.' });
    }
};

exports.getPublicTournaments = async (req, res) => {
  try {
    const now = Date.now();
    // Cache HIT
    if (GlobalTournamentCache.data && now - GlobalTournamentCache.timestamp < CACHE_TTL) {
       console.log('[CACHE] Serving Public Tournaments from Memory');
       return res.json({ success: true, data: GlobalTournamentCache.data, cached: true });
    }

    // Cache MISS - Heavy DB Query
    const tournaments = await Tournament.find({ status: { $in: ['published', 'registrations_open'] } })
       .populate('organizer', 'username')
       .sort({ tournamentStartDate: 1 })
       .limit(50);
       
    // Update Cache
    GlobalTournamentCache = { data: tournaments, timestamp: now };
    console.log('[CACHE] Stored DB Query results to Memory Cache');

    res.json({ success: true, data: tournaments, cached: false });
  } catch (error) {
    console.error('getPublicTournaments error:', error);
    res.status(500).json({ success: false, message: 'Failed to load public ledger' });
  }
};

// ============================================
// PHASE 1: REGISTRATIONS AND SLOTS
// ============================================

exports.getTournamentOverview = async (req, res) => {
  try {
     const tournament = await Tournament.findById(req.params.id);
     if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
     
     const totalRegs = await TournamentRegistration.countDocuments({ tournamentId: req.params.id });
     const approvedRegs = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'approved' });
     const waitlistRegs = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'waitlist' });
     
     const activeGroups = await TournamentGroup.countDocuments({ tournamentId: req.params.id });
     const completedStages = await TournamentStage.countDocuments({ tournamentId: req.params.id, isCompleted: true });

     res.json({
        success: true,
        data: {
           status: tournament.status,
           shortCode: tournament.shortCode,
           totalRegs,
           approvedRegs,
           waitlistRegs,
           activeGroups,
           completedStages,
           maxTeams: tournament.participation?.maxTeams || tournament.maxTeams || 100
        }
     });
  } catch(err) {
     res.status(500).json({ success: false, message: 'Overview extraction failed.' });
  }
};
const TournamentAuditLog = require('../models/TournamentAuditLog');

exports.getTournamentRegistrations = async (req, res) => {
  try {
    const regs = await TournamentRegistration.find({ tournamentId: req.params.id })
      .populate('teamId', 'name logo')
      .populate('userId', 'username email');
    res.json({ success: true, data: regs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed fetching registrations' });
  }
};

exports.updateRegistrationStatus = async (req, res) => {
  try {
    let { status, organizerNotes } = req.body;
    const reg = await TournamentRegistration.findById(req.params.regId);
    const tournament = await Tournament.findById(req.params.id);
    
    if (status === 'approved') {
       const currentApproved = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'approved' });
       const maxLimit = tournament.participation?.maxTeams || tournament.maxTeams || 100;
       
       if (currentApproved >= maxLimit) {
          status = 'waitlist';
          organizerNotes = organizerNotes ? organizerNotes + ' (Auto-Waitlisted due to max capacity)' : 'Auto-Waitlisted due to max capacity';
       }
    }

    if (status === 'waitlist' && reg.status !== 'waitlist') {
       const wCount = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'waitlist' });
       reg.waitlistRank = wCount + 1;
    } else if (status !== 'waitlist') {
       reg.waitlistRank = 0;
    }
    
    await TournamentAuditLog.create({
       tournamentId: req.params.id,
       actorId: req.user._id,
       action: `REGISTRATION_${status.toUpperCase()}`,
       targetEntityId: reg._id,
       oldValue: reg.status,
       newValue: status,
       reason: organizerNotes || 'Manual trigger'
    });

    reg.status = status;
    if (organizerNotes) reg.organizerNotes = organizerNotes;
    await reg.save();
    res.json({ success: true, data: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed updating status' });
  }
};

exports.getTournamentSlots = async (req, res) => {
  try {
    // Return the visual physical mapping of the tournament structure
    const stages = await TournamentStage.find({ tournamentId: req.params.id });
    const groups = await TournamentGroup.find({ tournamentId: req.params.id });
    let slots = await TournamentSlot.find({ tournamentId: req.params.id })
      .populate({
        path: 'occupyingTeam',
        select: 'name logo captain members tag',
        populate: { path: 'captain', select: 'username' }
      }).lean();

    const TournamentResult = require('../models/TournamentResult');
    const results = await TournamentResult.find({ tournamentId: req.params.id });
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

    slots = slots.map(slot => {
       if (slot.occupyingTeam && promotedTeamIds.has(slot.occupyingTeam._id.toString())) {
          return { ...slot, isPromoted: true };
       }
       return slot;
    });

    res.json({ success: true, data: { stages, groups, slots } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed fetching slot physics' });
  }
};

exports.autoSeedSlots = async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // ── Step 1: Clean slate — wipe any previous occupants on all slots ────────
    await TournamentSlot.updateMany(
      { tournamentId },
      { $set: { status: 'empty' }, $unset: { occupyingTeam: 1 } }
    );

    // ── Step 2: Reset any previously seeded registrations back to 'approved' ──
    await TournamentRegistration.updateMany(
      { tournamentId, status: 'checked-in' },
      { $set: { status: 'approved' } }
    );

    // ── Step 3: Fetch ALL approved registrations (every team gets a slot) ─────
    const approvedRegs = await TournamentRegistration.find({ tournamentId, status: 'approved' });
    if (!approvedRegs.length) {
      return res.status(400).json({ success: false, message: 'No approved teams to seed.' });
    }

    // ── Step 4: Fetch groups sorted alphabetically (A, B, C...) ───────────────
    const groups = await TournamentGroup.find({ tournamentId }).sort({ name: 1 });
    if (!groups.length) {
      return res.status(400).json({ success: false, message: 'No groups found. Generate groups first.' });
    }

    // ── Step 5: Fetch all slots and bucket them per group, sorted by slotNumber─
    const allSlots = await TournamentSlot.find({ tournamentId }).sort({ slotNumber: 1 });
    const slotsByGroup = {};
    groups.forEach(g => { slotsByGroup[g._id.toString()] = []; });
    allSlots.forEach(slot => {
      const gid = slot.groupId.toString();
      if (slotsByGroup[gid]) slotsByGroup[gid].push(slot);
    });

    // ── Step 6: Build round-robin slot order (slot 1 of A, slot 1 of B, ...) ──
    // This guarantees even distribution: if there are 100 teams across 6 groups,
    // each group gets 16-17 teams with empty slots clustered at the end.
    const orderedSlots = [];
    const maxSlots = Math.max(...groups.map(g => slotsByGroup[g._id.toString()].length));
    for (let i = 0; i < maxSlots; i++) {
      for (const group of groups) {
        const bucket = slotsByGroup[group._id.toString()];
        if (bucket[i]) orderedSlots.push(bucket[i]);
      }
    }

    // ── Step 7: Shuffle teams for random placement ────────────────────────────
    const shuffled = [...approvedRegs].sort(() => Math.random() - 0.5);

    // Every approved team MUST get a slot — cap only if slots are fewer
    const limit = Math.min(shuffled.length, orderedSlots.length);

    const slotUpdates = [];
    const regUpdates  = [];

    for (let i = 0; i < limit; i++) {
      orderedSlots[i].occupyingTeam = shuffled[i].teamId;
      orderedSlots[i].status = 'filled';
      slotUpdates.push(orderedSlots[i].save());

      shuffled[i].status = 'checked-in';
      regUpdates.push(shuffled[i].save());
    }

    await Promise.all([...slotUpdates, ...regUpdates]);

    const unseeded = shuffled.length - limit;
    const msg = unseeded > 0
      ? `Seeded ${limit} teams. Note: ${unseeded} teams have no available slots — increase group size or reduce teams per group.`
      : `All ${limit} teams successfully seeded across ${groups.length} groups (round-robin distribution).`;

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('autoSeedSlots error:', err);
    res.status(500).json({ success: false, message: 'Seeding algorithm failed.' });
  }
};

exports.swapSlots = async (req, res) => {
  try {
    const { slotAId, slotBId } = req.body;
    if (!slotAId || !slotBId) return res.status(400).json({ success: false, message: 'Both slotAId and slotBId are required.' });
    if (slotAId === slotBId) return res.status(400).json({ success: false, message: 'Cannot swap a slot with itself.' });

    const [slotA, slotB] = await Promise.all([
      TournamentSlot.findOne({ _id: slotAId, tournamentId: req.params.id }),
      TournamentSlot.findOne({ _id: slotBId, tournamentId: req.params.id }),
    ]);

    if (!slotA || !slotB) return res.status(404).json({ success: false, message: 'One or both slots not found.' });

    // Atomic swap of occupying teams and statuses
    const tempTeam = slotA.occupyingTeam;
    const tempStatus = slotA.status;

    slotA.occupyingTeam = slotB.occupyingTeam;
    slotA.status = slotB.status;

    slotB.occupyingTeam = tempTeam;
    slotB.status = tempStatus;

    await Promise.all([slotA.save(), slotB.save()]);

    res.json({ success: true, message: 'Slot swap complete.' });
  } catch (err) {
    console.error('swapSlots error:', err);
    res.status(500).json({ success: false, message: 'Slot swap failed.' });
  }
};

// ============================================ //
// Remove Team From Slot & Revoke Promotion     //
// ============================================ //
exports.removeTeamFromSlot = async (req, res) => {
  try {
    const { id: tournamentId, slotId } = req.params;
    
    const slot = await TournamentSlot.findOne({ _id: slotId, tournamentId }).populate('groupId');
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    if (!slot.occupyingTeam) return res.status(400).json({ success: false, message: 'Slot is already empty' });

    const teamId = slot.occupyingTeam.toString();
    const currentStageId = slot.groupId?.stageId;

    // 1. Clear the slot
    slot.occupyingTeam = null;
    slot.status = 'empty';
    await slot.save();

    // 2. Un-promote them from their previous stage results if they got here via promotion
    if (currentStageId) {
       const TournamentResult = require('../models/TournamentResult');
       await TournamentResult.updateOne(
         { tournamentId, 'standings.teamId': teamId, 'standings.promotedToStageId': currentStageId },
         { 
           $set: { 'standings.$.isQualifiedForNextStage': false },
           $unset: { 'standings.$.promotedToStageId': "" }
         }
       );
    }

    res.json({ success: true, message: 'Team removed from slot.' });
  } catch (err) {
    console.error('removeTeamFromSlot error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove team from slot.' });
  }
};

// ============================================
// PHASE 2: STAGES AND RESULTS (Data Pipelines)
// ============================================

exports.getTournamentStages = async (req, res) => {
  try {
    const stages = await TournamentStage.find({ tournamentId: req.params.id }).sort({ sequenceId: 1 });
    res.json({ success: true, data: stages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed fetching progression data.' });
  }
};

exports.advanceTournamentStage = async (req, res) => {
  try {
    const { currentStageId } = req.body;
    const current = await TournamentStage.findById(currentStageId);
    
    if (!current) return res.status(404).json({ success: false, message: 'Source Architecture Stage not found.' });
    if (current.isCompleted) return res.status(400).json({ success: false, message: 'Stage strictly locked.' });

    current.isCompleted = true;
    await current.save();

    await TournamentAuditLog.create({
       tournamentId: req.params.id,
       actorId: req.user._id,
       action: 'STAGE_PROGRESSED',
       targetEntityId: current._id,
       oldValue: false,
       newValue: true,
       reason: 'Manual Organizer Pipeline Advancement'
    });

    res.json({ success: true, message: 'Stage Progression Logically Locked and Verified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Progression sequence failure.' });
  }
};

exports.getTournamentResults = async (req, res) => {
    try {
       const TournamentResult = require('../models/TournamentResult');

       // Return results for ALL groups across ALL stages so the frontend can filter by groupId
       const results = await TournamentResult.find({ tournamentId: req.params.id })
          .populate({
            path: 'standings.teamId',
            select: 'name logo captain members tag',
            populate: { path: 'captain', select: 'username' }
          });

       res.json({ success: true, data: results });
    } catch (err) {
       res.status(500).json({ success: false, message: 'Result extraction failed.' });
    }
  };

// ── Group-specific results (reliable single-group fetch) ─────────────────────
exports.getGroupResults = async (req, res) => {
  try {
    const TournamentResult = require('../models/TournamentResult');
    const { id: tournamentId, groupId } = req.params;

    // Try exact groupId match first
    let result = await TournamentResult.findOne({ tournamentId, groupId })
      .populate({
        path: 'standings.teamId',
        select: 'name logo captain members tag',
        populate: { path: 'captain', select: 'username' }
      });

    // Fallback: look through all tournament results and match by groupId string comparison
    if (!result) {
      const allResults = await TournamentResult.find({ tournamentId })
        .populate({
          path: 'standings.teamId',
          select: 'name logo captain members tag',
          populate: { path: 'captain', select: 'username' }
        });
      result = allResults.find(r => r.groupId?.toString() === groupId) || null;
    }

    if (!result) return res.json({ success: true, data: null });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch group results.' });
  }
};
  
  exports.submitTournamentResults = async (req, res) => {
    try {
       const TournamentResult = require('../models/TournamentResult');
       const ScoringProfile = require('../models/ScoringProfile');
       const Stage = require('../models/TournamentStage');

       // Expecting stringified JSON array: [ { teamId: '...', placement: 1, kills: 12 }, ... ]
       let rawData;
       try {
           rawData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
       } catch (err) {
           return res.status(400).json({ success: false, message: 'Invalid JSON array structure.' });
       }
       
       if (!Array.isArray(rawData)) return res.status(400).json({ success: false, message: 'Input must be an array.' });

       const profile = await ScoringProfile.findOne({ tournamentId: req.params.id });
       const pointScale = profile ? profile.placementPoints : [10,6,5,4,3,2,1,1,0,0,0,0,0,0,0,0];
       const killMod = profile ? profile.killPoints : 1;

       let standings = rawData.map(entry => {
           let pp = 0;
           if (entry.placement >= 1 && entry.placement <= pointScale.length) {
               pp = pointScale[entry.placement - 1];
           }
           const kp = (entry.kills || 0) * killMod;
           const tp = pp + kp;

           return {
               teamId: entry.teamId,
               matchesPlayed: 1,
               totalKills: entry.kills || 0,
               placementPoints: pp,
               killPoints: kp,
               totalPoints: tp,
               rank: entry.placement || 0
           };
       });

       const groupIdFromBody = req.body.groupId || null;

       // Resolve the stageId — prefer the group's actual stage over fallback order:1
       let stageIdToUse = null;
       if (groupIdFromBody) {
         try {
           const grp = await TournamentGroup.findById(groupIdFromBody).select('stageId');
           if (grp?.stageId) stageIdToUse = grp.stageId;
         } catch (_) {}
       }
       
       if (!stageIdToUse) {
         const activeStage = await Stage.findOne({ tournamentId: req.params.id }).sort({ order: 1 });
         if (!activeStage) return res.status(400).json({ success: false, message: 'No stages found. Create a stage first.' });
         stageIdToUse = activeStage._id;
       }

       // Overwrite existing draft result or spawn new
       await TournamentResult.deleteMany({ tournamentId: req.params.id, stageId: stageIdToUse, groupId: groupIdFromBody });

       await TournamentResult.create({
           tournamentId: req.params.id,
           stageId: stageIdToUse,
           groupId: groupIdFromBody,
           status: 'provisional',
           standings: standings,
           publishedBy: req.user._id,
           publishedAt: new Date()
       });

       await TournamentAuditLog.create({
          tournamentId: req.params.id,
          actorId: req.user._id,
          action: 'RESULTS_PUBLISHED_PROVISIONAL',
          reason: `Calculated leaderboard arrays for ${standings.length} teams.`
       });
  
       res.json({ success: true, message: 'Provisional Leaderboard Results ingested and calculated successfully.' });
    } catch (err) {
       console.error(err);
       res.status(500).json({ success: false, message: 'Computational mapping failed.' });
    }
  };

// ============================================
// PHASE 3: FINANCE & COMMUNICATIONS (Operations)
// ============================================

/**
 * POST /:id/broadcast
 * Broadcast a formal announcement to all registered teams.
 * Saves to TournamentAnnouncement, emits via socket, posts to community chat,
 * and optionally emails all registered players via SMTP with file attachments.
 */
exports.broadcastAnnouncement = async (req, res) => {
  try {
    const { title, body } = req.body;
    const tournamentId = req.params.id;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and message body are required.' });
    }

    const TournamentAnnouncement = require('../models/TournamentAnnouncement');
    const TournamentChat = require('../models/TournamentChat');
    const User = require('../models/User');

    const tournament = await Tournament.findById(tournamentId);
    const tournamentName = tournament?.title || 'Tournament';

    // Save the announcement
    await TournamentAnnouncement.create({
      tournamentId,
      title,
      body,
      audience: 'all_registered',
      sentBy: req.user._id,
      priority: 'normal',
    });

    // Also save to community chat history so it appears in the chat feed
    const chatMsg = await TournamentChat.create({
      tournamentId,
      sender: req.user._id,
      content: `📢 ${title}\n${body}`,
      type: 'announcement',
      scope: 'tournament',
    });

    // Broadcast via socket to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament_${tournamentId}`).emit('tournament_message', {
        _id: chatMsg._id,
        tournamentId,
        content: `📢 ${title}\n${body}`,
        type: 'announcement',
        sender: {
          _id: req.user._id,
          username: req.user.username,
          role: req.user.role,
        },
        createdAt: chatMsg.createdAt,
      });
    }

    // Count recipients
    const registrations = await TournamentRegistration.find({ tournamentId }).select('userId');
    const recipientCount = registrations.length;

    res.json({
      success: true,
      message: 'Announcement broadcast successfully.',
      recipientCount,
    });
  } catch (err) {
    console.error('broadcastAnnouncement error:', err);
    res.status(500).json({ success: false, message: 'Failed to broadcast announcement.' });
  }
};

exports.getTournamentFinance = async (req, res) => {
  try {
     const tournament = await Tournament.findById(req.params.id);
     if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
     
     // Live economy extrapolation
     const approvedCount = await TournamentRegistration.countDocuments({ tournamentId: req.params.id, status: 'approved' });
     const totalRevenue = approvedCount * (tournament.finance.entryFee || 0);

     res.json({
        success: true,
        data: {
           entryFee: tournament.finance.entryFee || 0,
           totalPrizePool: tournament.finance.totalPrizePool || 0,
           actualRevenue: totalRevenue,
           approvedTeams: approvedCount,
           maxCapacityRevenue: (tournament.participation.maxTeams || 0) * (tournament.finance.entryFee || 0)
        }
     });
  } catch (err) {
     res.status(500).json({ success: false, message: 'Financial ledger fetch failed.' });
  }
};

exports.getTournamentAnnouncements = async (req, res) => {
   try {
      const Announcement = require('../models/TournamentAnnouncement');
      const messages = await Announcement.find({ tournamentId: req.params.id }).sort({ createdAt: -1 });
      res.json({ success: true, data: messages });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Broadcast ledger failed to load.' });
   }
};

exports.dispatchTournamentAnnouncement = async (req, res) => {
  try {
     const Announcement = require('../models/TournamentAnnouncement');
     const { title, body, audience, priority, targetGroupId } = req.body;

     if (!title || !body) return res.status(400).json({ success: false, message: 'Invalid payload.' });

     const message = await Announcement.create({
        tournamentId: req.params.id,
        title,
        body,
        audience: audience || 'global',
        priority: priority || 'normal',
        targetGroupId: targetGroupId || null,
        sentBy: req.user._id
     });

     await TournamentAuditLog.create({
        tournamentId: req.params.id,
        actorId: req.user._id,
        action: 'ANNOUNCEMENT_DISPATCHED',
        reason: `Targeted Audience: ${audience} | Priority: ${priority}`
     });

     res.json({ success: true, message: 'Secure Broadcast Sequence Dispatched.', data: message });
  } catch (err) {
     res.status(500).json({ success: false, message: 'Broadcast engine failed.' });
  }
};

// ============================================
// PHASE 4: PUBLIC LEDGER & TEAM REGISTRATION
// ============================================

exports.getPublicTournamentById = async (req, res) => {
  try {
     const isMongoId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
     const query = isMongoId ? { _id: req.params.id } : { shortCode: req.params.id };

     const tournament = await Tournament.findOne(query)
       .populate('organizer', 'username role')
       .populate('rulesEngineId')
       .populate('scoringProfileId');
       
     if (!tournament) return res.status(404).json({ success: false, message: 'Tournament ledger missing or deleted.' });

     res.json({ success: true, data: tournament });
  } catch (err) {
     res.status(500).json({ success: false, message: 'Failed fetching public interface data.' });
  }
};

exports.registerForTournament = async (req, res) => {
  try {
     // User authenticates, providing explicit roster lock for this specific instance.
     const { teamId, paymentMode, paymentProofImage, followProofImage, transactionId, roster, termsAccepted } = req.body;
     
     if (!termsAccepted) return res.status(400).json({ success: false, message: 'Tournament Rules must be explicitly accepted.' });
     if (!roster || roster.length === 0) return res.status(400).json({ success: false, message: 'A physical roster is required.' });

     // Double Registration Validation natively
     const exists = await TournamentRegistration.findOne({ tournamentId: req.params.id, teamId });
     if (exists) return res.status(400).json({ success: false, message: 'Team has already requested registration.' });

     const tournament = await Tournament.findById(req.params.id);
     if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found.' });

     let initialStatus = 'pending';
     if (tournament.finance?.entryFee === 0) {
        initialStatus = 'approved';
     } else if (paymentMode === 'manual') {
        initialStatus = 'payment_verification';
     }

     const registration = await TournamentRegistration.create({
        tournamentId: req.params.id,
        teamId,
        userId: req.user._id, // the captain acting
        status: initialStatus,
        paymentMode,
        paymentProofImage,
        followProofImage,
        transactionId,
        roster,
        termsAccepted
     });

     // Append audit trace representing external interaction
     await TournamentAuditLog.create({
        tournamentId: req.params.id,
        actorId: req.user._id,
        action: 'EXTERNAL_TEAM_REGISTRATION',
        targetEntityId: registration._id,
        reason: 'Player-initiated UI registration flow.'
     });

     res.status(201).json({ success: true, message: 'Roster submitted. Pending Organizer validation.', data: registration });
  } catch (err) {
     res.status(500).json({ success: false, message: 'Registration engine failed to process array.' });
  }
};

// ============================================
// PHASE 2 & 3: Check-ins and Auto-Promotion
// ============================================

exports.overrideCheckInStatus = async (req, res) => {
   try {
      const { checkInStatus, organizerNotes } = req.body;
      const reg = await TournamentRegistration.findById(req.params.regId);

      await TournamentAuditLog.create({
         tournamentId: req.params.id,
         actorId: req.user._id,
         action: `CHECKIN_OVERRIDE_${checkInStatus.toUpperCase()}`,
         targetEntityId: reg._id,
         oldValue: reg.checkInStatus,
         newValue: checkInStatus,
         reason: organizerNotes || 'Manual Organizer Check-in Override'
      });

      reg.checkInStatus = checkInStatus;
      if (organizerNotes) reg.organizerNotes = organizerNotes;
      await reg.save();

      res.json({ success: true, data: reg });
   } catch(err) {
      res.status(500).json({ success: false, message: 'Failed overriding check-in logic.' });
   }
};

exports.closeCheckInAndPromote = async (req, res) => {
   try {
      const tournamentId = req.params.id;
      const tournament = await Tournament.findById(tournamentId);

      // Phase 1: Vaporize No-Shows
      // Any team that was "approved" but did not natively click "checkInStatus: checked-in"
      const failedToReport = await TournamentRegistration.find({
          tournamentId,
          status: 'approved',
          checkInStatus: { $ne: 'checked-in' }
      });

      const failedIds = failedToReport.map(r => r._id);
      
      if (failedIds.length > 0) {
          await TournamentRegistration.updateMany(
              { _id: { $in: failedIds } },
              { $set: { status: 'rejected', checkInStatus: 'no-show', organizerNotes: 'Auto-Disqualified for missing Check-in Window.' } }
          );
      }

      // Phase 2: Waitlist Promotion Mathematics
      // Determine how many open slots physically exist now.
      const currentApprovedCount = await TournamentRegistration.countDocuments({ tournamentId, status: 'approved' });
      const physicalCapacity = tournament.participation?.maxTeams || tournament.maxTeams || 100;
      
      const slotsToFill = Math.max(0, physicalCapacity - currentApprovedCount);
      let promotedCount = 0;

      if (slotsToFill > 0) {
         // Pull Priority Waitlist natively sorted by rank
         const waitlistedTeams = await TournamentRegistration.find({ tournamentId, status: 'waitlist' })
            .sort({ waitlistRank: 1 })
            .limit(slotsToFill);

         if (waitlistedTeams.length > 0) {
             const promoteIds = waitlistedTeams.map(t => t._id);
             
             await TournamentRegistration.updateMany(
                 { _id: { $in: promoteIds } },
                 { $set: { status: 'approved', checkInStatus: 'checked-in', waitlistRank: 0, organizerNotes: 'Auto-Promoted from Priority Waitlist due to No-Shows.' } }
             );

             promotedCount = waitlistedTeams.length;
         }
      }

      // Re-index remaining logic ranks
      const remainingWaitlist = await TournamentRegistration.find({ tournamentId, status: 'waitlist' }).sort({ waitlistRank: 1 });
      for (let i = 0; i < remainingWaitlist.length; i++) {
         remainingWaitlist[i].waitlistRank = i + 1;
         await remainingWaitlist[i].save();
      }

      await TournamentAuditLog.create({
         tournamentId,
         actorId: req.user._id,
         action: 'CLOSE_CHECKIN_WINDOW',
         reason: `Automated Resolution: Swept ${failedIds.length} No-shows. Promoted ${promotedCount} teams.`
      });

      res.json({ success: true, message: `Check-in Phase Concluded. Removed ${failedIds.length} No-shows. Promoted ${promotedCount} from Waitlist.` });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Algorithmic check-in sweep failed.' });
   }
};

// ============================================
// PHASE 3: Room Verification & Releasing
// ============================================

exports.getTournamentRooms = async (req, res) => {
   try {
      const TournamentRoomRelease = require('../models/TournamentRoomRelease');
      // Return ALL room entries sorted by group then match number
      const rooms = await TournamentRoomRelease.find({ tournamentId: req.params.id })
        .sort({ groupId: 1, matchNumber: 1 });
      res.json({ success: true, data: rooms });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to access physical room vectors' });
   }
};

exports.saveTournamentRoom = async (req, res) => {
   try {
      const TournamentRoomRelease = require('../models/TournamentRoomRelease');
      const { groupId, roomId, roomPassword, mapName, isReleased, matchNumber } = req.body;
      const matchNum = parseInt(matchNumber) || 1;

      let room = await TournamentRoomRelease.findOne({ tournamentId: req.params.id, groupId, matchNumber: matchNum });
      if (room) {
         room.roomId = roomId;
         room.roomPassword = roomPassword;
         if (mapName) room.mapName = mapName;
         if (typeof isReleased === 'boolean') {
             if (room.isReleased !== isReleased) {
                 await TournamentAuditLog.create({
                    tournamentId: req.params.id,
                    actorId: req.user._id,
                    action: isReleased ? 'CREDENTIALS_RELEASED' : 'CREDENTIALS_REVOKED',
                    reason: `Group ${groupId} | Match ${matchNum}`
                 });
             }
             room.isReleased = isReleased;
         }
         await room.save();
      } else {
         room = await TournamentRoomRelease.create({
            tournamentId: req.params.id,
            groupId,
            matchNumber: matchNum,
            roomId,
            roomPassword,
            mapName: mapName || 'Erangel',
            isReleased: isReleased || false,
            createdBy: req.user._id
         });
         await TournamentAuditLog.create({
             tournamentId: req.params.id,
             actorId: req.user._id,
             action: 'CREDENTIALS_CREATED',
             reason: `Group ${groupId} | Match ${matchNum}`
         });
      }

      res.json({ success: true, data: room });
   } catch(err) {
      console.error('saveTournamentRoom error:', err);
      res.status(500).json({ success: false, message: 'Encryption and saving failed natively' });
   }
};

exports.deleteTournamentRoom = async (req, res) => {
   try {
      const TournamentRoomRelease = require('../models/TournamentRoomRelease');
      const { roomId: roomDocId } = req.params;
      await TournamentRoomRelease.deleteOne({ _id: roomDocId, tournamentId: req.params.id });
      res.json({ success: true, message: 'Match removed.' });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Delete failed.' });
   }
};

// ============================================
// PHASE 6: DISPUTES, LIFECYCLE CLOSE & WINNER
// ============================================

exports.getTournamentDisputes = async (req, res) => {
   try {
      const TournamentDispute = require('../models/TournamentDispute');
      const disputes = await TournamentDispute.find({ tournamentId: req.params.id })
         .populate('filedBy', 'username')
         .populate('teamId', 'name logo')
         .populate('resolvedBy', 'username')
         .sort({ createdAt: -1 });
      res.json({ success: true, data: disputes });
   } catch (err) {
      res.status(500).json({ success: false, message: 'Dispute ledger fetch failed.' });
   }
};

exports.createDispute = async (req, res) => {
   try {
      const TournamentDispute = require('../models/TournamentDispute');
      const { teamId, groupId, category, title, description, evidenceUrls } = req.body;
      if (!title || !description || !category) return res.status(400).json({ success: false, message: 'Missing dispute payload fields.' });
      const dispute = await TournamentDispute.create({
         tournamentId: req.params.id, filedBy: req.user._id, teamId,
         groupId: groupId || null, category, title, description, evidenceUrls: evidenceUrls || []
      });
      await TournamentAuditLog.create({ tournamentId: req.params.id, actorId: req.user._id, action: 'DISPUTE_FILED', targetEntityId: dispute._id, reason: title });
      res.status(201).json({ success: true, data: dispute, message: 'Dispute ticket filed.' });
   } catch (err) { res.status(500).json({ success: false, message: 'Dispute creation failed.' }); }
};

exports.resolveDispute = async (req, res) => {
   try {
      const TournamentDispute = require('../models/TournamentDispute');
      const { status, resolution } = req.body;
      const dispute = await TournamentDispute.findById(req.params.disputeId);
      if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found.' });
      dispute.status = status;
      if (resolution) dispute.resolution = resolution;
      if (status === 'resolved' || status === 'rejected') { dispute.resolvedBy = req.user._id; dispute.resolvedAt = new Date(); }
      await dispute.save();
      await TournamentAuditLog.create({ tournamentId: req.params.id, actorId: req.user._id, action: 'DISPUTE_' + status.toUpperCase(), targetEntityId: dispute._id, reason: resolution || '' });
      res.json({ success: true, data: dispute });
   } catch (err) { res.status(500).json({ success: false, message: 'Dispute resolution failed.' }); }
};

exports.closeTournament = async (req, res) => {
   try {
      const { winnerNote } = req.body;
      const tournament = await Tournament.findOne({ _id: req.params.id, organizer: req.user._id });
      if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found.' });
      if (tournament.status === 'completed') return res.status(400).json({ success: false, message: 'Already closed.' });
      const TournamentResult = require('../models/TournamentResult');
      await TournamentResult.updateMany({ tournamentId: req.params.id, status: 'provisional' }, { status: 'final' });
      tournament.status = 'completed';
      await tournament.save();
      await TournamentAuditLog.create({ tournamentId: req.params.id, actorId: req.user._id, action: 'TOURNAMENT_CLOSED', reason: winnerNote || 'Tournament concluded.' });
      res.json({ success: true, message: 'Tournament formally closed. Results finalized.' });
   } catch (err) { res.status(500).json({ success: false, message: 'Close sequence failed.' }); }
};

exports.getMyTournamentStatus = async (req, res) => {
   try {
      const TournamentRoomRelease = require('../models/TournamentRoomRelease');
      const Tournament = require('../models/Tournament');
      
      const isMongoId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
      const tournament = isMongoId 
         ? await Tournament.findById(req.params.id) 
         : await Tournament.findOne({ shortCode: req.params.id });
         
      if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found.' });

      const reg = await TournamentRegistration.findOne({ tournamentId: tournament._id, userId: req.user._id }).populate('teamId', 'name logo').lean();
      if (!reg) return res.json({ success: true, data: null });
      
      const TournamentSlot = require('../models/TournamentSlot');
      const slot = await TournamentSlot.findOne({ tournamentId: tournament._id, occupyingTeam: reg.teamId._id });
      
      if (slot) {
         reg.groupId = slot.groupId;
      }

      let matchRooms = [];
      let result = null;
      if (reg.groupId) {
         const rooms = await TournamentRoomRelease.find({ tournamentId: tournament._id, groupId: reg.groupId, isReleased: true })
                                                .sort('matchNumber');
         if (rooms.length > 0) {
           matchRooms = rooms.map(r => ({ matchNumber: r.matchNumber, roomId: r.roomId, roomPassword: r.roomPassword, mapName: r.mapName }));
         }
         
         const TournamentResult = require('../models/TournamentResult');
         const groupResult = await TournamentResult.findOne({ groupId: reg.groupId, status: { $ne: 'draft' } });
         if (groupResult && groupResult.standings) {
            result = groupResult.standings.find(s => s.teamId.toString() === reg.teamId._id.toString());
         }
      }
      res.json({ success: true, data: { registration: reg, matchRooms, result } });
   } catch (err) { res.status(500).json({ success: false, message: 'Status fetch failed.' }); }
};

exports.playerCheckIn = async (req, res) => {
   try {
      const reg = await TournamentRegistration.findOne({ tournamentId: req.params.id, userId: req.user._id });
      if (!reg) return res.status(404).json({ success: false, message: 'Registration not found.' });
      if (reg.status !== 'approved') return res.status(400).json({ success: false, message: 'Only approved teams can check in.' });
      if (reg.checkInStatus === 'checked-in') return res.status(400).json({ success: false, message: 'Already checked in.' });
      reg.checkInStatus = 'checked-in';
      await reg.save();
      await TournamentAuditLog.create({ tournamentId: req.params.id, actorId: req.user._id, action: 'PLAYER_SELF_CHECKIN', targetEntityId: reg._id, reason: 'Player confirmed readiness.' });
      res.json({ success: true, message: 'Check-in confirmed! Good luck.' });
   } catch (err) { res.status(500).json({ success: false, message: 'Check-in failed.' }); }
};

// Helper for slot propagation to avoid race conditions and deduplicate logic
const assigningTeams = new Set();
const assignTeamToNextStageSlot = async (tournamentId, oldResult, teamId, isQualified) => {
  const lockKey = `${tournamentId}-${teamId.toString()}`;
  if (assigningTeams.has(lockKey)) {
    console.warn(`[SlotAssign] Skipped concurrent assignment for team ${teamId}`);
    return;
  }
  assigningTeams.add(lockKey);
  try {
    const TournamentStage = require('../models/TournamentStage');
    const TournamentGroup = require('../models/TournamentGroup');
    const TournamentSlot = require('../models/TournamentSlot');
    const TournamentResult = require('../models/TournamentResult');

    if (isQualified) {
      const currentStageGroups = await TournamentGroup.find({ stageId: oldResult.stageId });
      const groupIds = currentStageGroups.map(g => g._id);
      const currentStage = await TournamentStage.findById(oldResult.stageId);

      let targetStageId = null;
      if (currentStage?.promotionRoutes?.length > 0) {
         // Determine route based on rank
         const ranked = [...oldResult.standings].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
         const teamRank = ranked.findIndex(s => s.teamId.toString() === teamId.toString()) + 1;
         const promotionCount = currentStage.promotionCount || 0;
         for (const r of currentStage.promotionRoutes) {
           const end = promotionCount > 0 ? promotionCount : r.rankEnd;
           if (teamRank >= r.rankStart && teamRank <= end) { targetStageId = r.targetId; break; }
         }
         if (!targetStageId) targetStageId = currentStage.promotionRoutes[0].targetId;
      } else if (currentStage) {
         const nextStage = await TournamentStage.findOne({ tournamentId, order: { $gt: currentStage.order } }).sort({ order: 1 });
         targetStageId = nextStage?._id;
      }

      if (targetStageId) {
        // Update promotedToStageId
        await TournamentResult.updateOne(
          { _id: oldResult._id, 'standings.teamId': teamId },
          { $set: { 'standings.$.promotedToStageId': targetStageId } }
        );

        // Assign slot in next stage if not already there
        const existingPromotedGroups = await TournamentGroup.find({ stageId: targetStageId });
        const existingPromotedGroupIds = existingPromotedGroups.map(g => g._id);
        
        const alreadyPromoted = await TournamentSlot.exists(
          { occupyingTeam: teamId, groupId: { $in: existingPromotedGroupIds } }
        );

        if (!alreadyPromoted) {
          // Find least-filled target group and assign slot
          const targetGroups = await TournamentGroup.find({ tournamentId, stageId: targetStageId }).sort({ name: 1 });
          if (targetGroups.length) {
            let targetGroup = targetGroups[0];
            let minFilled = Infinity;
            for (const grp of targetGroups) {
              const cnt = await TournamentSlot.countDocuments({ groupId: grp._id, status: 'filled' });
              if (cnt < minFilled) { minFilled = cnt; targetGroup = grp; }
            }
            
            // FIX: Atomic slot claim to prevent race condition overwritting slots
            const emptySlot = await TournamentSlot.findOneAndUpdate(
              { groupId: targetGroup._id, status: 'empty' },
              { $set: { occupyingTeam: teamId, status: 'filled', isPromoted: true } },
              { sort: { slotNumber: 1 }, new: true }
            );
            
            if (emptySlot) {
              console.log(`[Slot] ${teamId} → ${targetGroup.name} #${emptySlot.slotNumber}`);
            }
          }
        }
      }
    } else {
      // Revocation
      const standing = oldResult.standings.find(s => s.teamId.toString() === teamId.toString());
      const prevPromotedStageId = standing?.promotedToStageId;
      if (prevPromotedStageId) {
        const targetStageGroups = await TournamentGroup.find({ stageId: prevPromotedStageId });
        const targetGroupIds = targetStageGroups.map(g => g._id);

        await TournamentSlot.updateMany(
          { occupyingTeam: teamId, groupId: { $in: targetGroupIds } },
          { $set: { occupyingTeam: null, status: 'empty', isPromoted: false } }
        );
        console.log(`[Slot] Revoked promotion matching stage ${prevPromotedStageId}`);
      }
    }
  } catch (e) {
    console.warn('[SlotAssign] Non-fatal error:', e.message);
  } finally {
    assigningTeams.delete(lockKey);
  }
};

exports.toggleTeamQualification = async (req, res) => {
   try {
      const TournamentResult = require('../models/TournamentResult');
      const TournamentStage = require('../models/TournamentStage');
      const { id: tournamentId, groupId, teamId } = req.params;
      const { isQualified } = req.body;
      const qualify = Boolean(isQualified);

      const allResults = await TournamentResult.find({ tournamentId, 'standings.teamId': teamId });
      const oldResult = allResults.find(r => r.groupId?.toString() === groupId) || allResults[0];

      if (!oldResult) {
        return res.status(404).json({
          success: false,
          message: 'No declared results found. Please submit results from the Declare Results tab first.'
        });
      }

      const updateData = qualify
        ? { $set: { 'standings.$.isQualifiedForNextStage': true } }
        : { $set: { 'standings.$.isQualifiedForNextStage': false, 'standings.$.promotedToStageId': null } };

      await TournamentResult.findOneAndUpdate(
        { _id: oldResult._id, 'standings.teamId': teamId },
        updateData,
        { new: true }
      );

      // Auto-move to next connected stage
      if (qualify) {
        const group = await TournamentGroup.findById(groupId);
        if (group?.stageId) {
          const currentStage = await TournamentStage.findById(group.stageId);
          if (currentStage?.outputTargets?.length > 0) {
            const nextStageId = currentStage.outputTargets[0];
            const nextGroups = await TournamentGroup.find({ stageId: nextStageId }).sort({ name: 1 });
            
            if (nextGroups.length > 0) {
              // Find the group with least teams (balanced distribution)
              let bestGroup = null;
              let minFilled = Infinity;
              for (const ng of nextGroups) {
                const filled = await TournamentSlot.countDocuments({ groupId: ng._id, occupyingTeam: { $ne: null } });
                if (filled < ng.teamsLimit && filled < minFilled) {
                  minFilled = filled;
                  bestGroup = ng;
                }
              }
              
              if (bestGroup) {
                // Check not already in next stage
                const alreadyInNext = await TournamentSlot.findOne({ 
                  groupId: { $in: nextGroups.map(g => g._id) }, 
                  occupyingTeam: teamId 
                });
                
                if (!alreadyInNext) {
                  let slot = await TournamentSlot.findOne({ groupId: bestGroup._id, occupyingTeam: null }).sort({ slotNumber: 1 });
                  if (!slot) {
                    const count = await TournamentSlot.countDocuments({ groupId: bestGroup._id });
                    if (count < bestGroup.teamsLimit) {
                      slot = await TournamentSlot.create({ tournamentId, groupId: bestGroup._id, slotNumber: count + 1, status: 'empty' });
                    }
                  }
                  if (slot) {
                    slot.occupyingTeam = teamId;
                    slot.status = 'filled';
                    slot.assignedAt = new Date();
                    await slot.save();
                  }
                }
              }
            }
          }
        }
      } else {
        // Revoke: remove team from next stage slots
        const group = await TournamentGroup.findById(groupId);
        if (group?.stageId) {
          const currentStage = await TournamentStage.findById(group.stageId);
          if (currentStage?.outputTargets?.length > 0) {
            const nextStageId = currentStage.outputTargets[0];
            const nextGroups = await TournamentGroup.find({ stageId: nextStageId });
            const nextGroupIds = nextGroups.map(g => g._id);
            await TournamentSlot.updateMany(
              { groupId: { $in: nextGroupIds }, occupyingTeam: teamId },
              { $set: { occupyingTeam: null, status: 'empty', assignedAt: null } }
            );
          }
        }
      }

      res.json({ success: true, message: qualify ? '✅ Team Promoted & Moved to Next Stage' : 'Promotion Revoked & Removed from Next Stage' });

   } catch (err) {
      console.error('[toggleQualify]', err.message);
      res.status(500).json({ success: false, message: err.message || 'Failed to update qualification.' });
   }
};

exports.promoteTopTeams = async (req, res) => {
   try {
      const TournamentResult = require('../models/TournamentResult');
      const TournamentStage = require('../models/TournamentStage');
      const { id: tournamentId, groupId } = req.params;
      const { topN } = req.body;
      const limit = Number(topN) || 0;

      if (limit <= 0) return res.status(400).json({ success: false, message: 'Invalid number of teams to promote.' });

      const allGroupResults = await TournamentResult.find({ tournamentId });
      const oldResult = allGroupResults.find(r => r.groupId?.toString() === groupId) || null;

      if (!oldResult) {
        return res.status(404).json({ success: false, message: 'No declared results found. Please submit results first.' });
      }

      const sortedStandings = [...oldResult.standings].sort((a, b) => {
        const ptsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
        if (ptsDiff !== 0) return ptsDiff;
        return (a.rank || 999) - (b.rank || 999);
      });

      const updatedStandings = sortedStandings.map((s, idx) => {
         const qualify = idx < limit;
         const obj = typeof s.toObject === 'function' ? s.toObject() : s;
         return {
            ...obj,
            isQualifiedForNextStage: qualify,
            promotedToStageId: qualify ? obj.promotedToStageId : null
         };
      });

      oldResult.standings = updatedStandings;
      await oldResult.save();

      // Auto-move qualified teams to next connected stage
      const group = await TournamentGroup.findById(groupId);
      let movedCount = 0;
      if (group?.stageId) {
        const currentStage = await TournamentStage.findById(group.stageId);
        if (currentStage?.outputTargets?.length > 0) {
          const nextStageId = currentStage.outputTargets[0];
          const nextGroups = await TournamentGroup.find({ stageId: nextStageId }).sort({ name: 1 });

          if (nextGroups.length > 0) {
            const qualifiedTeamIds = updatedStandings
              .filter(s => s.isQualifiedForNextStage)
              .map(s => s.teamId.toString());
            
            // Remove previously promoted teams that are no longer qualified
            const unqualifiedTeamIds = updatedStandings
              .filter(s => !s.isQualifiedForNextStage)
              .map(s => s.teamId.toString());
            
            if (unqualifiedTeamIds.length > 0) {
              const nextGroupIds = nextGroups.map(g => g._id);
              await TournamentSlot.updateMany(
                { groupId: { $in: nextGroupIds }, occupyingTeam: { $in: unqualifiedTeamIds } },
                { $set: { occupyingTeam: null, status: 'empty', assignedAt: null } }
              );
            }
            
            // Round-robin insert qualified teams
            let groupIndex = 0;
            for (const teamId of qualifiedTeamIds) {
              // Check not already in next stage
              const alreadyInNext = await TournamentSlot.findOne({
                groupId: { $in: nextGroups.map(g => g._id) },
                occupyingTeam: teamId
              });
              if (alreadyInNext) continue;

              const targetGroup = nextGroups[groupIndex];
              let slot = await TournamentSlot.findOne({ groupId: targetGroup._id, occupyingTeam: null }).sort({ slotNumber: 1 });
              if (!slot) {
                const count = await TournamentSlot.countDocuments({ groupId: targetGroup._id });
                if (count < targetGroup.teamsLimit) {
                  slot = await TournamentSlot.create({ tournamentId, groupId: targetGroup._id, slotNumber: count + 1, status: 'empty' });
                }
              }
              if (slot) {
                slot.occupyingTeam = teamId;
                slot.status = 'filled';
                slot.assignedAt = new Date();
                await slot.save();
                movedCount++;
              }
              groupIndex = (groupIndex + 1) % nextGroups.length;
            }
          }
        }
      }

      res.json({ success: true, message: `Promoted top ${limit} teams. ${movedCount} moved to next stage.` });

   } catch (err) {
      console.error('[promoteTopTeams]', err.message);
      res.status(500).json({ success: false, message: err.message || 'Failed to promote top teams.' });
   }
};

exports.saveTournamentRoadmap = async (req, res) => {
   try {
      const { nodes, edges } = req.body;
      const tournamentId = req.params.id;
      const Stage = require('../models/TournamentStage');
      const mongoose = require('mongoose');
      
      const idMap = {}; // Maps frontend id to MongoDB _id
      
      // Update/Create Nodes
      for (const node of (nodes || [])) {
         const isTempId = !mongoose.Types.ObjectId.isValid(node.id);
         
         const stageData = {
            tournamentId,
            name: node.data.name || 'Untitled Stage',
            order: node.data.order || 1,
            type: node.data.type || 'custom',
            stageCategory: node.data.stageCategory || 'free',
            totalTeams: Number(node.data.totalTeams) || 0,
            groups: Number(node.data.groups) || 1,
            teamsPerGroup: Number(node.data.teamsPerGroup) || 20,
            qualificationType: node.data.qualificationType || 'top_per_group',
            promotionCount: Number(node.data.promotionCount) || 0,
            autoSeed: Boolean(node.data.autoSeed),
            autoPromote: Boolean(node.data.autoPromote),
            position: node.position
         };

         if (isTempId) {
            const newStage = await Stage.create(stageData);
            idMap[node.id] = newStage._id.toString();
         } else {
            await Stage.findByIdAndUpdate(node.id, stageData);
            idMap[node.id] = node.id;
         }
      }
      
      // Construct edges map for paths and sources
      const connections = {}; 
      const inputSourcesMap = {};
      for (const edge of (edges || [])) {
         const sourceMongo = idMap[edge.source] || edge.source;
         const targetMongo = idMap[edge.target] || edge.target;
         
         if (!connections[sourceMongo]) connections[sourceMongo] = [];
         connections[sourceMongo].push({
            targetId: targetMongo,
            rankStart: edge.data?.rankStart || 1,
            rankEnd: edge.data?.rankEnd || 10
         });

         if (!inputSourcesMap[targetMongo]) inputSourcesMap[targetMongo] = [];
         inputSourcesMap[targetMongo].push(sourceMongo);
      }
      
      // Update arrays and cleanup detached blocks
      for (const srcId of Object.values(idMap)) {
         const outRoutes = connections[srcId] || [];
         const inSources = inputSourcesMap[srcId] || [];
         const outTargets = outRoutes.map(r => r.targetId);
         await Stage.findByIdAndUpdate(srcId, { 
            promotionRoutes: outRoutes,
            outputTargets: outTargets,
            inputSources: inSources
         });
      }
      
      // Cleanup deleted nodes
      const allValidIds = Object.values(idMap);
      if (allValidIds.length > 0) {
         await Stage.deleteMany({ tournamentId, _id: { $nin: allValidIds } });
      } else if (nodes && nodes.length === 0) {
         await Stage.deleteMany({ tournamentId });
      }
      
      const finalStages = await Stage.find({ tournamentId });
      res.json({ success: true, message: 'Roadmap saved successfully', stages: finalStages });
   } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to save roadmap graph.' });
   }
};

exports.generateNextStageLogic = async (req, res) => {
   try {
      const Stage = require('../models/TournamentStage');
      const TournamentResult = require('../models/TournamentResult');
      const TournamentGroup = require('../models/TournamentGroup');
      const TournamentSlot = require('../models/TournamentSlot');
      
      const { id: tournamentId, stageId } = req.params;
      
      const currentStage = await Stage.findById(stageId);
      if (!currentStage || !currentStage.promotionRoutes?.length) {
         return res.status(400).json({ success: false, message: 'No distinct target stages mapped from this node.' });
      }
      
      const results = await TournamentResult.find({ stageId: currentStage._id });
      if (results.length === 0) {
         return res.status(400).json({ success: false, message: 'No results recorded to simulate distribution.' });
      }

      let actionsLog = [];
      
      // Compute Multi-Path Splits
      for (const route of currentStage.promotionRoutes) {
          const targetStage = await Stage.findById(route.targetId);
          if (!targetStage) continue;

          let pushedTeamsForRoute = [];
          if (currentStage.qualificationType === 'top_per_group') {
             // Splitting relatively per each literal Match Group 
             results.forEach(resRecord => {
                 const groupRanked = resRecord.standings.sort((a,b) => b.totalPoints - a.totalPoints).map(s => s.teamId);
                 const sStart = Math.max(0, (route.rankStart || 1) - 1);
                 const sEnd = route.rankEnd || groupRanked.length;
                 pushedTeamsForRoute.push(...groupRanked.slice(sStart, sEnd));
             });
          } else {
             // Splitting over absolute Grand Aggregate Top Leaderboard
             let allGlobal = [];
             results.forEach(resRecord => allGlobal.push(...resRecord.standings));
             allGlobal = allGlobal.sort((a,b) => b.totalPoints - a.totalPoints).map(s => s.teamId);
             const sStart = Math.max(0, (route.rankStart || 1) - 1);
             const sEnd = route.rankEnd || allGlobal.length;
             pushedTeamsForRoute.push(...allGlobal.slice(sStart, sEnd));
          }

          if (pushedTeamsForRoute.length === 0) continue;

          // Load into the Merge Wait Pool (de-duplicating strictly)
          const newPending = [...new Set([...(targetStage.pendingTeams || []).map(t => t.toString()), ...pushedTeamsForRoute.map(t => t.toString())])];
          targetStage.pendingTeams = newPending;
          
          // Check Target Capacity Limit representing standard Merge Completion
          const targetCapacityLimit = targetStage.totalTeams || (targetStage.groups * targetStage.teamsPerGroup);
          if (targetStage.pendingTeams.length >= targetCapacityLimit) {
              // Target has sufficiently absorbed streams -> AUTO ACTIVATE Match Layouts
              const numGroups = targetStage.groups || 1;
              const tpg = targetStage.teamsPerGroup || 25;
              
              // Eradicate any previous stale state 
              const existingGroups = await TournamentGroup.find({ stageId: targetStage._id });
              for (const eg of existingGroups) {
                 await TournamentSlot.deleteMany({ groupId: eg._id });
              }
              await TournamentGroup.deleteMany({ stageId: targetStage._id });
              
              let shuffledPool = targetStage.pendingTeams.sort(() => Math.random() - 0.5);
              let teamIndex = 0;
              
              for (let i = 0; i < numGroups; i++) {
                 const grp = await TournamentGroup.create({
                    tournamentId,
                    stageId: targetStage._id,
                    name: `${targetStage.name} - Group ${String.fromCharCode(65 + i)}`,
                    teamsLimit: tpg
                 });
                 for (let s = 1; s <= tpg; s++) {
                    let occupiedBy = null;
                    let status = 'empty';
                    if (teamIndex < shuffledPool.length) {
                       occupiedBy = shuffledPool[teamIndex];
                       status = 'filled';
                       teamIndex++;
                    }
                    await TournamentSlot.create({ groupId: grp._id, slotNumber: s, occupyingTeam: occupiedBy, status });
                 }
              }
              actionsLog.push(`Fully initialized ${targetStage.name} mapping ${shuffledPool.length} merged teams.`);
          } else {
              actionsLog.push(`Awaiting Input Merge: Sent ${pushedTeamsForRoute.length} array to ${targetStage.name} (${targetStage.pendingTeams.length}/${targetCapacityLimit} pending limit hit)`);
          }
          await targetStage.save();
      }
      
      res.json({ success: true, message: `Engine executed! \n${actionsLog.join(' \n')}` });
   } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Core multi-path generator execution failed.' });
   }
};

exports.generateRoadmapViaAI = async (req, res) => {
   try {
      const aiService = require('../services/aiRoadmapGenerator');
      const { prompt } = req.body;
      
      if (!prompt) {
          return res.status(400).json({ success: false, message: 'A descriptive prompt is required.' });
      }
      
      const generatedRoadmap = await aiService.generateRoadmap(prompt);
      res.json({ success: true, message: 'AI generated roadmap successfully.', roadmap: generatedRoadmap });
   } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message || 'AI generation failed.' });
   }
};

/**
 * POST /:id/scaffold-roadmap
 * Physically materializes TournamentGroups + TournamentSlots for all saved roadmap stages.
 * FREE stages → groups + slots pre-created and ready for auto-seeding from registrations.
 * PAID/WILDCARD stages → groups created as "invite-only" with empty join-based slots (no auto-seeding).
 */
exports.scaffoldRoadmap = async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 1. Load all saved stages for this tournament
    const stages = await TournamentStage.find({ tournamentId }).sort({ order: 1 });
    if (!stages || stages.length === 0) {
      return res.status(400).json({ success: false, message: 'No roadmap stages found. Save your roadmap first.' });
    }

    // 2. Wipe existing scaffold (groups + slots) to allow regeneration
    await TournamentSlot.deleteMany({ tournamentId });
    await TournamentGroup.deleteMany({ tournamentId });

    // Reset checked-in registrations back to approved so they can be re-seeded
    await TournamentRegistration.updateMany(
      { tournamentId, status: 'checked-in' },
      { $set: { status: 'approved' } }
    );

    const createdGroupSummary = [];

    // 3. For each stage, create the physical groups + slots
    for (const stage of stages) {
      const numGroups = stage.groups || 1;
      const teamsPerGrp = stage.teamsPerGroup || 20;
      const isPaidStage = stage.stageCategory === 'paid' || stage.type === 'wildcard';

      for (let g = 0; g < numGroups; g++) {
        const groupLetter = String.fromCharCode(65 + g); // A, B, C...
        const groupName = numGroups === 1
          ? stage.name
          : `${stage.name} - Group ${groupLetter}`;

        const group = await TournamentGroup.create({
          tournamentId,
          stageId: stage._id,
          name: groupName,
          status: 'pending',
          teamsLimit: teamsPerGrp,
          // Tag paid groups for invite-only join behavior
          ...(isPaidStage ? { joinMode: 'invite' } : { joinMode: 'auto' })
        });

        // Create empty slots for this group
        const slotDocs = [];
        for (let s = 1; s <= teamsPerGrp; s++) {
          slotDocs.push({
            tournamentId,
            groupId: group._id,
            slotNumber: s,
            status: 'empty',
            isReserved: false,
            // Paid slots start locked until organizer sends invite
            isLocked: isPaidStage
          });
        }
        await TournamentSlot.insertMany(slotDocs);

        createdGroupSummary.push({
          stageName: stage.name,
          stageType: stage.type,
          stageCategory: stage.stageCategory,
          groupName,
          slots: teamsPerGrp,
          joinMode: isPaidStage ? 'invite' : 'auto'
        });
      }
    }

    // 4. Auto-seed approved registrations into FREE root stage slots
    const rootStages = stages.filter(s =>
      (!s.inputSources || s.inputSources.length === 0) &&
      s.stageCategory !== 'paid' &&
      s.type !== 'wildcard'
    );

    if (rootStages.length > 0) {
      const rootStageIds = rootStages.map(s => s._id);
      const rootGroups = await TournamentGroup.find({ tournamentId, stageId: { $in: rootStageIds } }).sort({ name: 1 });
      const approvedRegs = await TournamentRegistration.find({ tournamentId, status: 'approved' })
        .populate('teamId');

      if (approvedRegs.length > 0 && rootGroups.length > 0) {
        const allRootSlots = await TournamentSlot.find({
          tournamentId,
          groupId: { $in: rootGroups.map(g => g._id) }
        }).sort({ slotNumber: 1 });

        // Build round-robin slot order across root groups
        const slotsByGroup = {};
        rootGroups.forEach(g => { slotsByGroup[g._id.toString()] = []; });
        allRootSlots.forEach(slot => {
          const gid = slot.groupId.toString();
          if (slotsByGroup[gid]) slotsByGroup[gid].push(slot);
        });

        const orderedSlots = [];
        const maxPerGroup = Math.max(...rootGroups.map(g => slotsByGroup[g._id.toString()].length));
        for (let i = 0; i < maxPerGroup; i++) {
          for (const group of rootGroups) {
            const bucket = slotsByGroup[group._id.toString()];
            if (bucket[i]) orderedSlots.push(bucket[i]);
          }
        }

        // Shuffle for fairness then assign
        const shuffled = [...approvedRegs].sort(() => Math.random() - 0.5);
        const bulkSlotOps = [];
        const bulkRegOps = [];

        for (let i = 0; i < Math.min(shuffled.length, orderedSlots.length); i++) {
          const reg = shuffled[i];
          const slot = orderedSlots[i];
          const teamId = reg.teamId?._id || reg.teamId;

          bulkSlotOps.push({
            updateOne: {
              filter: { _id: slot._id },
              update: { $set: { occupyingTeam: teamId, status: 'filled' } }
            }
          });
          bulkRegOps.push({
            updateOne: {
              filter: { _id: reg._id },
              update: { $set: { status: 'checked-in' } }
            }
          });
        }

        if (bulkSlotOps.length > 0) await TournamentSlot.bulkWrite(bulkSlotOps);
        if (bulkRegOps.length > 0) await TournamentRegistration.bulkWrite(bulkRegOps);
      }
    }

    res.json({
      success: true,
      message: `Roadmap scaffolded! ${createdGroupSummary.length} groups created across ${stages.length} stages.`,
      summary: createdGroupSummary
    });

  } catch (err) {
    console.error('scaffoldRoadmap error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to scaffold roadmap.' });
  }
};

/**
 * POST /:id/groups/:groupId/invite-link
 * Organizer generates (or regenerates) a unique invite link for an invite-only group.
 * Token is valid for 7 days.
 */
exports.generateGroupInviteLink = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const crypto = require('crypto');
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    group.inviteToken = token;
    group.inviteExpiresAt = expiresAt;
    await group.save();

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendBase}/tournament-join/${token}`;

    res.json({ success: true, inviteUrl, token, expiresAt, message: 'Invite link generated successfully.' });
  } catch (err) {
    console.error('generateGroupInviteLink error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate invite link.' });
  }
};

/**
 * POST /:id/groups/:groupId/multi-invite
 * Grand Finals / Paid groups: generate N individual per-team invite links (one per empty slot).
 */
exports.generateMultiInviteLinks = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const crypto = require('crypto');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Count empty slots
    const emptySlots = await TournamentSlot.find({ groupId: group._id, status: 'empty' }).sort({ slotNumber: 1 });
    if (!emptySlots.length) return res.status(400).json({ success: false, message: 'No empty slots to generate links for.' });

    // Generate one token per empty slot
    const newTokens = emptySlots.map(slot => ({
      token: crypto.randomBytes(24).toString('hex'),
      slotNumber: slot.slotNumber,
      claimedByTeam: null,
      expiresAt
    }));

    // Replace old multi-tokens + set new ones
    group.multiInviteTokens = newTokens;
    await group.save();

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const links = newTokens.map(t => ({
      slotNumber: t.slotNumber,
      token: t.token,
      url: `${frontendBase}/tournament-join/${t.token}?multi=1`,
      claimed: false
    }));

    res.json({ success: true, links, expiresAt, message: `${links.length} unique invite links generated.` });
  } catch (err) {
    console.error('generateMultiInviteLinks error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate multi-invite links.' });
  }
};

/**
 * GET /tournaments/join-invite/:token
 * PUBLIC: Validate invite token and return group + tournament details so the player can confirm joining.
 */
exports.getInviteLinkDetails = async (req, res) => {
  try {
    const { token } = req.params;
    // Check single-token
    let group = await TournamentGroup.findOne({ inviteToken: token })
      .populate('tournamentId', 'title game banner')
      .populate('stageId', 'name type stageCategory');

    let multiTokenEntry = null;
    if (!group) {
      // Check multi-token
      group = await TournamentGroup.findOne({ 'multiInviteTokens.token': token })
        .populate('tournamentId', 'title game banner')
        .populate('stageId', 'name type stageCategory');
      if (group) multiTokenEntry = group.multiInviteTokens.find(t => t.token === token);
    }

    if (!group) return res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });

    const expiry = multiTokenEntry ? multiTokenEntry.expiresAt : group.inviteExpiresAt;
    if (expiry && expiry < new Date()) {
      return res.status(410).json({ success: false, message: 'This invite link has expired.' });
    }
    if (multiTokenEntry?.claimedByTeam) {
      return res.status(400).json({ success: false, message: 'This invite link has already been claimed.' });
    }

    const filledSlots = await TournamentSlot.countDocuments({ groupId: group._id, status: 'filled' });

    res.json({
      success: true,
      data: {
        group: { _id: group._id, name: group.name, teamsLimit: group.teamsLimit, filledSlots },
        tournament: group.tournamentId,
        stage: group.stageId,
        expiresAt: expiry,
        isMultiToken: !!multiTokenEntry,
        slotNumber: multiTokenEntry?.slotNumber
      }
    });
  } catch (err) {
    console.error('getInviteLinkDetails error:', err);
    res.status(500).json({ success: false, message: 'Failed to load invite details.' });
  }
};

/**
 * POST /tournaments/join-invite/:token
 * Team captain uses invite link to claim an empty slot in the LCQ group.
 * Requires auth — uses the captain's active team.
 */
exports.joinViaInviteLink = async (req, res) => {
  try {
    const { token } = req.params;
    // Check SINGLE invite token first
    let group = await TournamentGroup.findOne({ inviteToken: token })
      .populate('tournamentId', 'title game banner')
      .populate('stageId', 'name type stageCategory');

    let isMultiToken = false;
    let multiTokenEntry = null;

    // If no single-token match, check multi-tokens
    if (!group) {
      group = await TournamentGroup.findOne({ 'multiInviteTokens.token': token })
        .populate('tournamentId', 'title game banner')
        .populate('stageId', 'name type stageCategory');
      if (group) {
        isMultiToken = true;
        multiTokenEntry = group.multiInviteTokens.find(t => t.token === token);
      }
    }

    if (!group) return res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });

    // Check expiry
    const expiry = isMultiToken ? multiTokenEntry?.expiresAt : group.inviteExpiresAt;
    if (expiry && expiry < new Date()) {
      return res.status(410).json({ success: false, message: 'This invite link has expired.' });
    }

    // For multi-token: check if already claimed
    if (isMultiToken && multiTokenEntry?.claimedByTeam) {
      return res.status(400).json({ success: false, message: 'This invite link has already been used by another team.' });
    }

    // Verify user has a team (captain OR member)
    const Team = require('../models/Team');
    let team = await Team.findOne({ captain: req.user._id });
    if (!team) {
      // Not a captain — check if they're a member of any team
      team = await Team.findOne({ 'members.user': req.user._id });
    }
    if (!team) return res.status(400).json({ success: false, message: 'You need to be part of a team to join. Create or join a team first.' });

    // Check team not already in this tournament group
    const alreadySeeded = await TournamentSlot.findOne({ groupId: group._id, occupyingTeam: team._id });
    if (alreadySeeded) return res.status(400).json({ success: false, message: 'Your team is already in this group.' });

    let targetSlot;
    if (isMultiToken && multiTokenEntry?.slotNumber) {
      // Multi-token: claim the specific slot for this token
      targetSlot = await TournamentSlot.findOne({ groupId: group._id, slotNumber: multiTokenEntry.slotNumber, status: 'empty' });
      if (!targetSlot) {
        // Slot already taken — find next available
        targetSlot = await TournamentSlot.findOne({ groupId: group._id, status: 'empty' }).sort({ slotNumber: 1 });
      }
    } else {
      // Single invite: first available empty slot
      targetSlot = await TournamentSlot.findOne({ groupId: group._id, status: 'empty' }).sort({ slotNumber: 1 });
    }

    if (!targetSlot) return res.status(400).json({ success: false, message: 'No slots available in this group.' });

    targetSlot.occupyingTeam = team._id;
    targetSlot.status = 'filled';
    await targetSlot.save();

    // Mark multi-token as claimed
    if (isMultiToken && multiTokenEntry) {
      multiTokenEntry.claimedByTeam = team._id;
      await group.save();
    }

    res.json({ success: true, message: `Your team "${team.name}" has joined ${group.name}!`, slot: targetSlot });
  } catch (err) {
    console.error('joinViaInviteLink error:', err);
    res.status(500).json({ success: false, message: 'Failed to join via invite.' });
  }
};

/**
 * POST /:id/groups/:groupId/auto-promote
 * Reads the stage's promotionRoutes (rankStart/rankEnd/targetId) and automatically
 * marks teams qualified for their correct next stage based on their declared result ranking.
 * Returns a summary of what promotions were applied per route.
 */
exports.autoPromoteFromRoadmap = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    const TournamentResult = require('../models/TournamentResult');

    // 1. Load the group and its parent stage
    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId }).populate('stageId');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const stage = group.stageId;
    if (!stage) return res.status(404).json({ success: false, message: 'Stage not linked to this group.' });

    const promotionRoutes = stage.promotionRoutes || [];
    const stagePromotionCount = stage.promotionCount || 0;

    // If no promotion routes are configured at all
    if (!promotionRoutes.length && !stagePromotionCount) {
      return res.status(400).json({ success: false, message: 'No promotion routes configured for this stage in the roadmap. Edit the connecting edges in Stage Builder.' });
    }

    // Build effective routes — if stage has a promotionCount, use it to override edge rankEnd
    const effectiveRoutes = promotionRoutes.length
      ? promotionRoutes.map(r => ({
          ...r,
          // Override rankEnd with stage.promotionCount if it's explicitly set and edge still has default (10)
          rankEnd: stagePromotionCount && stagePromotionCount > 0 ? stagePromotionCount : (r.rankEnd || 10)
        }))
      : [{ rankStart: 1, rankEnd: stagePromotionCount, targetId: null }]; // fallback synthetic route

    // 2. Load declared result — try 3 tiers, pick the one with most standings
    const candidateQueries = [
      TournamentResult.findOne({ tournamentId, groupId }).populate('standings.teamId', 'name logo'),
      TournamentResult.findOne({ tournamentId, stageId: stage._id }).populate('standings.teamId', 'name logo'),
      TournamentResult.findOne({ tournamentId }).sort({ createdAt: -1 }).populate('standings.teamId', 'name logo')
    ];
    const candidates = await Promise.all(candidateQueries.map(q => q.catch(() => null)));
    const result = candidates
      .filter(Boolean)
      .sort((a, b) => (b.standings?.length || 0) - (a.standings?.length || 0))[0];

    if (!result || !result.standings?.length) {
      return res.status(400).json({ success: false, message: 'No declared results found. Go to Declare Results tab and submit first.' });
    }

    // 3. Sort teams by declared points (desc), use rank field as tiebreaker
    const ranked = [...result.standings].sort((a, b) => {
      const ptsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (ptsDiff !== 0) return ptsDiff;
      return (a.rank || 999) - (b.rank || 999);
    });

    // 4. For each promotion route, mark teams in that rank range
    const promotionSummary = [];
    let anyChanged = false;

    for (const route of effectiveRoutes) {
      const { rankStart, rankEnd, targetId } = route;
      const promoted = [];

      // rankStart and rankEnd are 1-indexed
      for (let i = (rankStart - 1); i < Math.min(rankEnd, ranked.length); i++) {
        const standing = ranked[i];
        if (standing) {
          standing.isQualifiedForNextStage = true;
          standing.promotedToStageId = targetId || null;
          promoted.push(standing.teamId?.name || 'Unknown Team');
          anyChanged = true;
        }
      }

      // Load target stage name for the summary
      let targetName = targetId || 'Next Stage';
      try {
        const targetStage = await TournamentStage.findById(targetId).select('name');
        if (targetStage) targetName = targetStage.name;
      } catch (_) {}

      promotionSummary.push({
        targetId,
        targetName,
        rankRange: `Rank ${rankStart}–${rankEnd}`,
        teamsPromoted: promoted
      });
    }

    if (anyChanged) await result.save();

    // 5. Assign promoted teams into the target stage's group slots
    const slotAssignmentSummary = [];
    for (const route of effectiveRoutes) {
      const { rankStart, rankEnd, targetId } = route;
      if (!targetId) continue;

      // Get the teams promoted via this route (in rank order)
      const teamsForThisRoute = ranked
        .slice(rankStart - 1, rankEnd)
        .filter(s => s.isQualifiedForNextStage)
        .map(s => s.teamId?._id || s.teamId);

      if (!teamsForThisRoute.length) continue;

      // Get target stage groups sorted alphabetically
      const targetGroups = await TournamentGroup.find({ tournamentId, stageId: targetId }).sort({ name: 1 });
      if (!targetGroups.length) continue;

      for (let t = 0; t < teamsForThisRoute.length; t++) {
        const teamId = teamsForThisRoute[t];
        if (!teamId) continue;

        // Round-robin across target groups
        const targetGroup = targetGroups[t % targetGroups.length];

        // Find the next empty slot in this group
        const emptySlot = await TournamentSlot.findOne({
          groupId: targetGroup._id,
          status: 'empty'
        }).sort({ slotNumber: 1 });

        if (emptySlot) {
          emptySlot.occupyingTeam = teamId;
          emptySlot.status = 'filled';
          await emptySlot.save();
          slotAssignmentSummary.push({ groupName: targetGroup.name, teamId, slotNumber: emptySlot.slotNumber });
        }
      }
    }

    res.json({
      success: true,
      message: `Auto-promoted ${promotionSummary.reduce((sum, r) => sum + r.teamsPromoted.length, 0)} teams across ${promotionSummary.length} route(s). ${slotAssignmentSummary.length} slots assigned in the next stage.`,
      summary: promotionSummary,
      slotAssignments: slotAssignmentSummary
    });

  } catch (err) {
    console.error('autoPromoteFromRoadmap error:', err);
    res.status(500).json({ success: false, message: err.message || 'Auto-promotion failed.' });
  }
};

/**
 * POST /:id/groups/:groupId/notify-email
 * Organizer composes a message → sent to emails of all registered players in this group.
 * Collects emails from: slot occupants → team captain/members → User.email
 */
exports.sendGroupEmailNotification = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    const { subject, body } = req.body;

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject and body are required.' });
    }

    const { sendGroupNotification } = require('../services/email.service');
    const Team = require('../models/Team');
    const User = require('../models/User');

    // 1. Get all filled slots in this group
    const slots = await TournamentSlot.find({ tournamentId, groupId, status: 'filled' })
      .populate({
        path: 'occupyingTeam',
        select: 'captain members',
        populate: [
          { path: 'captain', select: 'email username' },
          { path: 'members.user', select: 'email username' }
        ]
      });

    if (!slots.length) {
      return res.status(400).json({ success: false, message: 'No filled slots found in this group.' });
    }

    // 2. Collect unique emails
    const emailSet = new Set();
    for (const slot of slots) {
      const team = slot.occupyingTeam;
      if (!team) continue;
      // Captain
      if (team.captain?.email) emailSet.add(team.captain.email);
      // Members
      if (Array.isArray(team.members)) {
        for (const m of team.members) {
          if (m.user?.email) emailSet.add(m.user.email);
        }
      }
    }

    if (!emailSet.size) {
      return res.status(400).json({ success: false, message: 'No player emails found. Ensure players have registered accounts.' });
    }

    // 3. Load group + tournament for template
    const group = await TournamentGroup.findById(groupId).select('name');
    const tournament = await Tournament.findById(tournamentId).select('title');

    // 4. Send
    const result = await sendGroupNotification({
      to: [...emailSet],
      subject: subject.trim(),
      body: body.trim(),
      tournamentName: tournament?.title,
      groupName: group?.name,
      attachments: req.files || []
    });

    // 5. Log audit
    await TournamentAuditLog.create({
      tournamentId,
      actorId: req.user._id,
      action: 'GROUP_EMAIL_NOTIFICATION_SENT',
      reason: `Subject: "${subject}" — Sent to ${result.sent} players in ${group?.name}`
    });

    res.json({
      success: true,
      message: `✅ Email sent to ${result.sent} player(s).${result.failed ? ` ${result.failed} failed.` : ''}`,
      sent: result.sent,
      failed: result.failed,
      recipientCount: emailSet.size
    });
  } catch (err) {
    console.error('[GroupEmailNotification]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to send email notification.' });
  }
};

// ============================================
// PRIZE POOL DISTRIBUTION
// ============================================

/**
 * GET /:id/prize-config
 * Get prize distribution config for a tournament.
 */
exports.getPrizeConfig = async (req, res) => {
  try {
    const PrizeConfig = require('../models/TournamentPrizeConfig');
    const tournament = await Tournament.findById(req.params.id).select('finance.totalPrizePool finance.currency title');
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found.' });

    const config = await PrizeConfig.findOne({ tournamentId: req.params.id });
    res.json({ success: true, data: { config: config || null, tournament } });
  } catch (err) {
    console.error('getPrizeConfig error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch prize config.' });
  }
};

/**
 * POST /:id/prize-config
 * Save/update prize distribution config. Validates total <= 100%.
 */
exports.savePrizeConfig = async (req, res) => {
  try {
    const PrizeConfig = require('../models/TournamentPrizeConfig');
    const { positionDeltas, bonusRewards } = req.body;

    if (!Array.isArray(positionDeltas) || positionDeltas.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one position prize is required.' });
    }

    const sumPositions = positionDeltas.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
    const mvp = Number(bonusRewards?.mvpPercent || 0);
    const fragger = Number(bonusRewards?.topFraggerPercent || 0);
    const total = sumPositions + mvp + fragger;

    if (total > 100) {
      return res.status(400).json({ success: false, message: `Total distribution is ${total}%. It cannot exceed 100%.` });
    }

    const config = await PrizeConfig.findOneAndUpdate(
      { tournamentId: req.params.id },
      {
        tournamentId: req.params.id,
        positionDeltas: positionDeltas.map(p => ({
          position: Number(p.position),
          percentage: Number(p.percentage),
          label: p.label || ''
        })),
        bonusRewards: {
          mvpPercent: mvp,
          topFraggerPercent: fragger,
          perKillAmount: Number(bonusRewards?.perKillAmount || 0)
        }
      },
      { upsert: true, new: true, runValidators: false }
    );

    await TournamentAuditLog.create({
      tournamentId: req.params.id,
      actorId: req.user._id,
      action: 'PRIZE_CONFIG_SAVED',
      reason: `Prize distribution saved: ${positionDeltas.length} positions, total ${total}%`
    });

    res.json({ success: true, message: 'Prize distribution saved successfully.', data: config });
  } catch (err) {
    console.error('savePrizeConfig error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save prize config.' });
  }
};

/**
 * POST /:id/results/publish
 * Publish (finalize) results for a specific group. Sets status from 'provisional' -> 'final'.
 * Body: { groupId }
 */
exports.publishGroupResults = async (req, res) => {
  try {
    const TournamentResult = require('../models/TournamentResult');
    const { groupId } = req.body;

    const query = { tournamentId: req.params.id };
    if (groupId) query.groupId = groupId;

    const result = await TournamentResult.findOne(query);
    if (!result) {
      return res.status(404).json({ success: false, message: 'No results found to publish. Save results first.' });
    }

    result.status = 'final';
    result.publishedBy = req.user._id;
    result.publishedAt = new Date();
    await result.save();

    await TournamentAuditLog.create({
      tournamentId: req.params.id,
      actorId: req.user._id,
      action: 'RESULTS_PUBLISHED_FINAL',
      reason: `Results finalized and published for ${groupId ? `group ${groupId}` : 'tournament'}`
    });

    res.json({ success: true, message: '🏆 Results published and finalized!', data: result });
  } catch (err) {
    console.error('publishGroupResults error:', err);
    res.status(500).json({ success: false, message: 'Failed to publish results.' });
  }
};

exports.getMyParticipatingTournaments = async (req, res) => {
  try {
    const TournamentRegistration = require('../models/TournamentRegistration');
    // Find all registrations where the user is part of the roster or registered the team
    const registrations = await TournamentRegistration.find({
      $or: [
        { userId: req.user._id },
        { 'roster.playerId': req.user._id }
      ]
    }).populate('tournamentId');

    // Extract unique tournaments
    const tournamentMap = new Map();
    registrations.forEach(reg => {
      if (reg.tournamentId && !tournamentMap.has(reg.tournamentId._id.toString())) {
        tournamentMap.set(reg.tournamentId._id.toString(), reg.tournamentId);
      }
    });

    const tournaments = Array.from(tournamentMap.values());
    
    // Sort by descending date
    tournaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, tournaments });
  } catch (error) {
    console.error('getMyParticipatingTournaments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch participating tournaments.' });
  }
};


// ============================================
// MANUAL GROUP MANAGEMENT
// ============================================

exports.createTournamentGroup = async (req, res) => {
  try {
    const { name, teamsLimit, joinMode, promotionCount, stageId } = req.body;
    const tournamentId = req.params.id;

    if (!name || !teamsLimit) return res.status(400).json({ success: false, message: 'Group Name and Teams Limit are required.' });

    const newGroup = await TournamentGroup.create({
      tournamentId,
      stageId: stageId || null,
      name,
      teamsLimit: Number(teamsLimit),
      joinMode: joinMode || 'auto',
      promotionCount: Number(promotionCount) || 0
    });

    // Create empty slots for this group
    const slots = [];
    for (let i = 1; i <= newGroup.teamsLimit; i++) {
      slots.push({
        tournamentId,
        groupId: newGroup._id,
        slotNumber: i,
        status: 'empty'
      });
    }
    const TournamentSlot = require('../models/TournamentSlot');
    await TournamentSlot.insertMany(slots);

    await TournamentAuditLog.create({
      tournamentId,
      actorId: req.user._id,
      action: 'GROUP_CREATED',
      targetEntityId: newGroup._id,
      reason: `Manually created group: ${name}`
    });

    res.status(201).json({ success: true, message: 'Group created successfully.', data: newGroup });
  } catch (err) {
    console.error('createTournamentGroup error:', err);
    res.status(500).json({ success: false, message: 'Failed to create group.' });
  }
};

exports.updateTournamentGroup = async (req, res) => {
  try {
    const { name, teamsLimit, joinMode, promotionCount } = req.body;
    const { id: tournamentId, groupId } = req.params;

    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    if (name) group.name = name;
    if (joinMode) group.joinMode = joinMode;
    if (promotionCount !== undefined) group.promotionCount = Number(promotionCount);

    if (teamsLimit && Number(teamsLimit) !== group.teamsLimit) {
      const newLimit = Number(teamsLimit);
      const TournamentSlot = require('../models/TournamentSlot');

      if (newLimit > group.teamsLimit) {
        // Add slots
        const slotsToAdd = [];
        for (let i = group.teamsLimit + 1; i <= newLimit; i++) {
          slotsToAdd.push({
            tournamentId,
            groupId: group._id,
            slotNumber: i,
            status: 'empty'
          });
        }
        await TournamentSlot.insertMany(slotsToAdd);
      } else if (newLimit < group.teamsLimit) {
        // Remove slots (only if empty to prevent data loss)
        const excessSlots = await TournamentSlot.find({ groupId: group._id, slotNumber: { $gt: newLimit } });
        const hasOccupied = excessSlots.some(s => s.occupyingTeam);
        if (hasOccupied) {
          return res.status(400).json({ success: false, message: 'Cannot reduce limit: some excess slots are occupied. Remove teams first.' });
        }
        await TournamentSlot.deleteMany({ groupId: group._id, slotNumber: { $gt: newLimit } });
      }
      group.teamsLimit = newLimit;
    }

    await group.save();
    
    await TournamentAuditLog.create({
      tournamentId,
      actorId: req.user._id,
      action: 'GROUP_UPDATED',
      targetEntityId: group._id,
      reason: `Updated group settings: ${group.name}`
    });

    res.json({ success: true, message: 'Group updated successfully.', data: group });
  } catch (err) {
    console.error('updateTournamentGroup error:', err);
    res.status(500).json({ success: false, message: 'Failed to update group.' });
  }
};

exports.deleteTournamentGroup = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;

    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const TournamentSlot = require('../models/TournamentSlot');
    await TournamentSlot.deleteMany({ groupId: group._id });
    
    const TournamentResult = require('../models/TournamentResult');
    await TournamentResult.deleteMany({ groupId: group._id });

    await group.deleteOne();

    await TournamentAuditLog.create({
      tournamentId,
      actorId: req.user._id,
      action: 'GROUP_DELETED',
      reason: `Deleted group: ${group.name}`
    });

    res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (err) {
    console.error('deleteTournamentGroup error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete group.' });
  }
};

exports.addTeamsToGroup = async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    const { teamIds } = req.body; // Array of team ObjectIds

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No teams provided.' });
    }

    const group = await TournamentGroup.findOne({ _id: groupId, tournamentId });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const TournamentSlot = require('../models/TournamentSlot');
    const emptySlots = await TournamentSlot.find({ groupId, status: 'empty' }).sort({ slotNumber: 1 });

    if (emptySlots.length < teamIds.length) {
      return res.status(400).json({ success: false, message: `Only ${emptySlots.length} empty slots available, but you selected ${teamIds.length} teams.` });
    }

    const updates = [];
    for (let i = 0; i < teamIds.length; i++) {
      emptySlots[i].occupyingTeam = teamIds[i];
      emptySlots[i].status = 'filled';
      updates.push(emptySlots[i].save());
    }

    await Promise.all(updates);

    await TournamentAuditLog.create({
      tournamentId,
      actorId: req.user._id,
      action: 'GROUP_TEAMS_ADDED',
      targetEntityId: groupId,
      reason: `Manually added ${teamIds.length} teams to ${group.name}`
    });

    res.json({ success: true, message: `Successfully added ${teamIds.length} teams to ${group.name}.` });
  } catch (err) {
    console.error('addTeamsToGroup error:', err);
    res.status(500).json({ success: false, message: 'Failed to add teams.' });
  }
};

// ============================================
// STAGE-FIRST CONTAINER LOGIC (V2)
// ============================================

exports.createSimpleStage = async (req, res) => {
  try {
    const { name, type } = req.body;
    const tournamentId = req.params.id;

    if (!name) return res.status(400).json({ success: false, message: 'Stage name is required.' });

    const existingStages = await TournamentStage.find({ tournamentId });
    const order = existingStages.length + 1;

    const newStage = await TournamentStage.create({
      tournamentId,
      name,
      type: type || 'custom',
      order,
      inputSources: [],
      outputTargets: []
    });

    res.status(201).json({ success: true, message: 'Stage created.', data: newStage });
  } catch (err) {
    console.error('createSimpleStage error:', err);
    res.status(500).json({ success: false, message: 'Failed to create stage.' });
  }
};

exports.deleteStage = async (req, res) => {
  try {
    const { id: tournamentId, stageId } = req.params;

    const stage = await TournamentStage.findOne({ _id: stageId, tournamentId });
    if (!stage) return res.status(404).json({ success: false, message: 'Stage not found.' });

    // Find all groups in this stage and delete them + their slots
    const groups = await TournamentGroup.find({ stageId: stage._id });
    for (const g of groups) {
      const TournamentSlot = require('../models/TournamentSlot');
      await TournamentSlot.deleteMany({ groupId: g._id });
      const TournamentResult = require('../models/TournamentResult');
      await TournamentResult.deleteMany({ groupId: g._id });
      await g.deleteOne();
    }

    // Unlink this stage from any connections
    await TournamentStage.updateMany(
      { tournamentId },
      { $pull: { outputTargets: stage._id.toString(), inputSources: stage._id.toString() } }
    );

    await stage.deleteOne();

    res.json({ success: true, message: 'Stage and contained groups deleted.' });
  } catch (err) {
    console.error('deleteStage error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete stage.' });
  }
};

exports.connectStage = async (req, res) => {
  try {
    const { id: tournamentId, stageId } = req.params;
    const { feedsIntoId } = req.body; // Can be null to disconnect

    const stage = await TournamentStage.findOne({ _id: stageId, tournamentId });
    if (!stage) return res.status(404).json({ success: false, message: 'Stage not found.' });

    // Clear existing connections first (simplifying to 1 target)
    const oldTargets = stage.outputTargets || [];
    for (const targetId of oldTargets) {
      await TournamentStage.updateOne(
        { _id: targetId },
        { $pull: { inputSources: stage._id.toString() } }
      );
    }
    stage.outputTargets = [];

    if (feedsIntoId) {
      if (feedsIntoId === stageId) {
        return res.status(400).json({ success: false, message: 'Stage cannot feed into itself.' });
      }

      // Check for circular dependency
      let current = await TournamentStage.findById(feedsIntoId);
      let isCircular = false;
      while (current) {
        if (current._id.toString() === stageId) {
          isCircular = true;
          break;
        }
        if (!current.outputTargets || current.outputTargets.length === 0) break;
        current = await TournamentStage.findById(current.outputTargets[0]);
      }

      if (isCircular) {
        return res.status(400).json({ success: false, message: 'Circular connection detected. Invalid.' });
      }

      // Valid connection
      stage.outputTargets = [feedsIntoId];
      await TournamentStage.updateOne(
        { _id: feedsIntoId },
        { $addToSet: { inputSources: stage._id.toString() } }
      );
    }

    await stage.save();

    res.json({ success: true, message: 'Stage connection updated.', data: stage });
  } catch (err) {
    console.error('connectStage error:', err);
    res.status(500).json({ success: false, message: 'Failed to connect stage.' });
  }
};

exports.importRegisteredTeams = async (req, res) => {
  try {
    const { id: tournamentId, stageId } = req.params;

    // 1. Get all groups in this stage
    const groups = await TournamentGroup.find({ stageId }).sort({ name: 1 });
    if (groups.length === 0) {
      return res.status(400).json({ success: false, message: 'Create groups in this stage first before importing teams.' });
    }

    // 2. Get all approved registrations
    const registrations = await TournamentRegistration.find({
      tournamentId,
      status: 'approved'
    });

    if (registrations.length === 0) {
      return res.status(400).json({ success: false, message: 'No approved registrations found. Approve teams in the Registrations tab first.' });
    }

    // 3. Build a set of teams already slotted in this stage to avoid duplicates
    const groupIds = groups.map(g => g._id);
    const existingSlots = await TournamentSlot.find({ groupId: { $in: groupIds }, occupyingTeam: { $ne: null } });
    const alreadySlottedTeams = new Set(existingSlots.map(s => s.occupyingTeam.toString()));

    // Deduplicate registrations by teamId (multiple users from same team may register)
    const seenTeamIds = new Set();
    const uniqueRegistrations = registrations.filter(r => {
      const tid = r.teamId.toString();
      if (seenTeamIds.has(tid)) return false;
      seenTeamIds.add(tid);
      return true;
    });

    // Filter out teams already in this stage
    const teamsToImport = uniqueRegistrations.filter(r => !alreadySlottedTeams.has(r.teamId.toString()));

    if (teamsToImport.length === 0) {
      return res.status(400).json({ success: false, message: 'All approved teams are already imported into this stage.' });
    }

    // 4. Pre-load empty slots per group for efficient round-robin
    const emptySlotsByGroup = {};
    for (const group of groups) {
      emptySlotsByGroup[group._id.toString()] = await TournamentSlot.find({
        groupId: group._id,
        occupyingTeam: null
      }).sort({ slotNumber: 1 }).lean();
    }

    // 5. Round-robin distribute — skip full groups, auto-expand if needed
    let groupIndex = 0;
    let distributedCount = 0;

    for (const reg of teamsToImport) {
      let slotFound = false;
      let attempts = 0;

      // Try each group in round-robin, skip full ones
      while (!slotFound && attempts < groups.length) {
        const group = groups[groupIndex];
        const gid = group._id.toString();

        // Check if there's a pre-loaded empty slot
        if (emptySlotsByGroup[gid]?.length > 0) {
          const emptySlotData = emptySlotsByGroup[gid].shift();
          await TournamentSlot.updateOne({ _id: emptySlotData._id }, {
            $set: { occupyingTeam: reg.teamId, status: 'filled', assignedAt: new Date() }
          });
          distributedCount++;
          slotFound = true;
        } else {
          // No empty slot — try creating one if under capacity
          const currentCount = await TournamentSlot.countDocuments({ groupId: group._id });
          if (currentCount < group.teamsLimit) {
            const slot = await TournamentSlot.create({
              tournamentId,
              groupId: group._id,
              slotNumber: currentCount + 1,
              occupyingTeam: reg.teamId,
              status: 'filled',
              assignedAt: new Date()
            });
            distributedCount++;
            slotFound = true;
          }
        }

        groupIndex = (groupIndex + 1) % groups.length;
        if (slotFound) break;
        attempts++;
      }

      // If all groups are full after trying all, auto-expand the least-filled group
      if (!slotFound) {
        // Find group with fewest teams
        let minGroup = groups[0];
        let minCount = Infinity;
        for (const g of groups) {
          const cnt = await TournamentSlot.countDocuments({ groupId: g._id });
          if (cnt < minCount) { minCount = cnt; minGroup = g; }
        }
        // Expand capacity and add team
        minGroup.teamsLimit = minCount + 1;
        await minGroup.save();
        await TournamentSlot.create({
          tournamentId,
          groupId: minGroup._id,
          slotNumber: minCount + 1,
          occupyingTeam: reg.teamId,
          status: 'filled',
          assignedAt: new Date()
        });
        distributedCount++;
      }
    }

    res.json({ success: true, message: `Successfully imported ${distributedCount} teams across ${groups.length} groups.` });
  } catch (err) {
    console.error('importRegisteredTeams error:', err);
    res.status(500).json({ success: false, message: 'Failed to import teams.' });
  }
};
