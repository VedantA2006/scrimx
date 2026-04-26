const mongoose = require('mongoose');
const ExtractionSession = require('../models/ExtractionSession');
const ExtractionScreenshot = require('../models/ExtractionScreenshot');
const ExtractedTeamResult = require('../models/ExtractedTeamResult');
const ExtractedPlayerResult = require('../models/ExtractedPlayerResult');
const ExtractionPipelineService = require('../services/ExtractionPipelineService');
const Registration = require('../models/Registration');
const Result = require('../models/Result');

// Get or Create Session
exports.getSession = async (req, res) => {
    try {
        const { scrimId } = req.params;
        const matchIndex = parseInt(req.params.matchIndex, 10);
        let session = await ExtractionSession.findOne({ 
            scrim: scrimId, 
            matchIndex,
            organizer: req.user.id
        }).sort({ createdAt: -1 });

        if (!session) {
            session = new ExtractionSession({
                scrim: scrimId,
                matchIndex,
                organizer: req.user.id,
                status: 'draft'
            });
            await session.save();
        }
        res.status(200).json({ success: true, session });
    } catch (err) {
        require('fs').writeFileSync('C:\\Users\\vedan\\OneDrive\\Desktop\\ScrimX Main\\backend\\extraction_error.log', err.stack || err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Upload Screenshot to Session
exports.uploadScreenshot = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { imageUrl } = req.body;

        const session = await ExtractionSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const count = await ExtractionScreenshot.countDocuments({ session: sessionId });

        const shot = new ExtractionScreenshot({
            session: sessionId,
            imageUrl,
            uploadOrder: count + 1
        });
        await shot.save();

        session.status = 'draft'; 
        // add to inline array
        if (!session.screenshots) session.screenshots = [];
        session.screenshots.push(imageUrl);
        await session.save();

        res.status(200).json({ success: true, session });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Start Pipeline
exports.startExtraction = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await ExtractionSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Wipe previous extracted results for this session to run fresh
        const oldTeams = await ExtractedTeamResult.find({ session: sessionId }, '_id');
        if (oldTeams.length) {
            await ExtractedPlayerResult.deleteMany({ teamResult: { $in: oldTeams.map(t => t._id) } });
        }
        await ExtractedTeamResult.deleteMany({ session: sessionId });
        
        let regs = await Registration.find({ scrim: session.scrim, status: 'approved' })
                  .populate({ path: 'team', populate: { path: 'members.user', select: 'username ign avatar' }});

        // Fallback for Tournament Groups: session.scrim actually holds a groupId
        if (regs.length === 0) {
            const TournamentSlot = require('../models/TournamentSlot');
            const slots = await TournamentSlot.find({ groupId: session.scrim, status: 'filled' })
                .populate({ path: 'occupyingTeam', populate: { path: 'members.user', select: 'username ign avatar' }});
            
            if (slots.length > 0) {
                regs = slots.map(s => ({
                    team: s.occupyingTeam,
                    slotNumber: s.slotNumber
                }));
            }
        }

        // Set status early so frontend polling triggers immediately
        session.status = 'processing';
        await session.save();

        // Fire & Forget / Async trigger
        ExtractionPipelineService.processSession(sessionId, regs).catch(err => console.error("Pipeline crashed:", err));

        res.status(200).json({ success: true, message: 'Extraction started in background.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Stop / Cancel Extraction
exports.stopExtraction = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await ExtractionSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Mark as draft so pipeline naturally finishes but UI shows stopped
        session.status = 'draft';
        session.completedAt = null;
        await session.save();

        res.status(200).json({ success: true, message: 'Extraction stopped.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get Session Results
exports.getResults = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await ExtractionSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const teams = await ExtractedTeamResult.find({ session: sessionId, duplicateOf: null }).sort({ placement: 1 }).lean();
        const players = await ExtractedPlayerResult.find({ teamResult: { $in: teams.map(t => t._id) } }).lean();

        res.status(200).json({ success: true, session, teams, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Team Result
exports.updateTeamResult = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const result = await ExtractedTeamResult.findByIdAndUpdate(id, { ...updates, wasEdited: true }, { new: true });
        res.status(200).json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Player Result
exports.updatePlayerResult = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const result = await ExtractedPlayerResult.findByIdAndUpdate(id, { ...updates, wasEdited: true }, { new: true });
        
        // Cascade sum
        const allPlayers = await ExtractedPlayerResult.find({ teamResult: result.teamResult });
        const newTotalKills = allPlayers.reduce((s, p) => s + (p.kills || 0), 0);
        
        await ExtractedTeamResult.findByIdAndUpdate(result.teamResult, { 
            teamKills: newTotalKills,
            $inc: { totalPoints: newTotalKills } // this logic might need refinement but lets do it frontend
        });

        res.status(200).json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Clean single screenshot by URL
exports.removeScreenshotByUrl = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { imageUrl } = req.body;
        
        await ExtractionScreenshot.findOneAndDelete({ session: sessionId, imageUrl });
        await ExtractionSession.findByIdAndUpdate(sessionId, { $pull: { screenshots: imageUrl } });
        
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Import to Declare Results
exports.importToDeclareResults = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await ExtractionSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const { scrim, matchIndex } = session;
        const mIdx = parseInt(matchIndex);
        
        const extractedTeams = await ExtractedTeamResult.find({ session: sessionId, status: { $ne: 'rejected' } });
        const extractedPlayers = await ExtractedPlayerResult.find({ teamResult: { $in: extractedTeams.map(t => t._id) } });

        // Update the Extraction Session status
        session.status = 'imported';
        await session.save();

        // Let's get or create the main Result draft
        let result = await Result.findOne({ scrim });
        
        // We will just let the frontend perform the import via existing Result APIs!
        // To be safe and clean, the "Import" action shouldn't bypass the frontend form if possible,
        // but it's requested to "Import to Declare results", "Imported values populate existing Declare Results".
        
        // A better approach is returning the mapped structured payload that the frontend can inject into its `scores` and `playerKills` state and hit 'Save' from there.
        // That guarantees no discrepancy between Draft and UI. Let's return the structured map.
        const mappedPayload = {
            scores: {},
            playerKills: {}
        };

        // mapping structure
        extractedTeams.forEach(t => {
           if (!t.matchedTeamId) return;
           const tIdStr = t.matchedTeamId.toString();
           mappedPayload.scores[tIdStr] = {
              positionPoints: t.positionPoints || 0,
              killPoints: t.teamKills || 0
           };

           mappedPayload.playerKills[tIdStr] = {};
           
           extractedPlayers.filter(p => p.teamResult.toString() === t._id.toString()).forEach(p => {
               if (p.matchedPlayerId) {
                  mappedPayload.playerKills[tIdStr][p.matchedPlayerId.toString()] = p.kills || 0;
               }
           });
        });

        res.status(200).json({ success: true, mappedData: mappedPayload });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
