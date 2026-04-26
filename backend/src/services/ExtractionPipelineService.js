const NvidiaOCRService = require('./NvidiaOCRService');
const NvidiaVLMService = require('./NvidiaVLMService');
const MatchingEngine = require('./MatchingEngine');

const ExtractionSession = require('../models/ExtractionSession');
const ExtractionScreenshot = require('../models/ExtractionScreenshot');
const ExtractedTeamResult = require('../models/ExtractedTeamResult');
const ExtractedPlayerResult = require('../models/ExtractedPlayerResult');

const getBgmiPositionPoints = (placement) => {
    const pointsMap = {
        1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1
    };
    return pointsMap[placement] || 0;
};

class ExtractionPipelineService {

    async processSession(sessionId, slotListRegistrations) {
        const session = await ExtractionSession.findById(sessionId);
        if (!session) throw new Error('Session not found');

        // Wrap entire pipeline so session never stays stuck as 'processing'
        try {
            session.status = 'processing';
            session.startedAt = new Date();
            session.lastError = '';
            await session.save();

            const screenshots = await ExtractionScreenshot.find({ session: sessionId }).sort({ uploadOrder: 1 });

            if (screenshots.length === 0) {
                session.status = 'failed';
                session.lastError = 'No screenshots found for this session.';
                await session.save();
                return session;
            }

            let extractedAny = false;

            // Step A: Process all screenshots concurrently using the strict Nemotron prompt 
            console.log(`[Pipeline] Dispatching ${screenshots.length} screenshots concurrently...`);
            const extractionPromises = screenshots.map(async (shot, idx) => {
                console.log(`[Pipeline] Starting OCR/VLM extraction for shot ${idx + 1}`);
                // Single pass VLM extraction via NvidiaOCRService (which uses Nemotron VLM)
                const parsedData = await NvidiaOCRService.extract(shot.imageUrl);
                return { shot, parsedData };
            });

            const results = await Promise.all(extractionPromises);

            // Step B: Set up safe in-memory deduplication
            const existingResults = await ExtractedTeamResult.find({
                session: sessionId,
                status: { $ne: 'rejected' }
            });
            const seenPlacements = new Set(existingResults.map(r => r.placement));

            // Step C: Iterate over concurrently gathered data to calculate matches
            for (const result of results) {
                const { shot, parsedData } = result;

                if (!Array.isArray(parsedData) || parsedData.length === 0) {
                    console.warn(`[Pipeline] Extraction returned empty data for shot ID ${shot._id}, skipping.`);
                    continue;
                }

                for (let blockIndex = 0; blockIndex < parsedData.length; blockIndex++) {
                    const block = parsedData[blockIndex];
                    if (!block || typeof block.placement !== 'number') continue;

                    // Synchronous in-memory dedup check
                    if (seenPlacements.has(block.placement)) {
                        console.log(`[Pipeline] Placement #${block.placement} already extracted, skipping duplicate.`);
                        continue;
                    }
                    seenPlacements.add(block.placement);

                    const matchResult = MatchingEngine.matchTeamBlock(block, slotListRegistrations);

                    const teamKills = matchResult.extractedPlayers.reduce((sum, p) => sum + p.kills, 0);
                    const posPoints = getBgmiPositionPoints(block.placement);
                    const totalPts = teamKills + posPoints;

                    const teamRecord = new ExtractedTeamResult({
                        session: sessionId,
                        placement: block.placement,
                        matchedSlotNumber: matchResult.slotNumber,
                        matchedTeamId: matchResult.teamId,
                        matchedTeamName: matchResult.teamName,
                        teamConfidence: matchResult.teamConfidence,
                        teamConfidenceScore: matchResult.teamConfidenceScore,
                        positionPoints: posPoints,
                        teamKills,
                        totalPoints: totalPts,
                        sourceScreenshotId: shot._id,
                        sourceBlockIndex: blockIndex,
                        usedVLM: true,
                        duplicateOf: null
                    });

                    await teamRecord.save();
                    extractedAny = true;

                    const playerDocs = matchResult.extractedPlayers.map((exPlayer, pIdx) => {
                        const matchedP = matchResult.playerMatchesMap[pIdx] || {};
                        let pConf = 'none';
                        if (matchedP.confidenceScore > 0.8) pConf = 'high';
                        else if (matchedP.confidenceScore > 0.5) pConf = 'medium';
                        else if (matchedP.confidenceScore > 0) pConf = 'low';

                        const mongoose = require('mongoose');
                        const rawPId = matchedP.matchedPlayerId;
                        let safePlayerId = null;
                        if (rawPId && mongoose.Types.ObjectId.isValid(rawPId)) {
                            safePlayerId = new mongoose.Types.ObjectId(rawPId);
                        }
                        return {
                            teamResult: teamRecord._id,
                            ocrName: exPlayer.originalStr,
                            vlmRefinedName: exPlayer.originalStr, 
                            matchedPlayerId: safePlayerId,
                            matchedPlayerName: matchedP.matchedPlayerName || '',
                            kills: exPlayer.kills,
                            confidence: pConf,
                            usedVLM: true
                        };
                    });

                    if (playerDocs.length > 0) {
                        await ExtractedPlayerResult.insertMany(playerDocs);
                    }
                }
            }
            // Step D: Fill in unmatched registered teams as placeholders so ALL teams appear
            const extractedTeamIds = new Set(
                (await ExtractedTeamResult.find({ session: sessionId }, 'matchedTeamId').lean())
                    .map(r => r.matchedTeamId?.toString()).filter(Boolean)
            );

            let nextPlacement = seenPlacements.size > 0 ? Math.max(...Array.from(seenPlacements)) + 1 : 1;
            for (const reg of slotListRegistrations) {
                const teamId = reg.team?._id?.toString();
                if (!teamId || extractedTeamIds.has(teamId)) continue;

                // Ensure we don't accidentally collide if max logic fails
                while (seenPlacements.has(nextPlacement)) {
                    nextPlacement++;
                }

                const placeholderRecord = new ExtractedTeamResult({
                    session: sessionId,
                    placement: nextPlacement,
                    matchedSlotNumber: reg.slotNumber || null,
                    matchedTeamId: reg.team._id,
                    matchedTeamName: reg.team.name,
                    teamConfidence: 'none',
                    teamConfidenceScore: 0,
                    positionPoints: 0,
                    teamKills: 0,
                    totalPoints: 0,
                    sourceScreenshotId: null,
                    sourceBlockIndex: -1,
                    usedVLM: false,
                    duplicateOf: null,
                    status: 'pending_review'
                });
                await placeholderRecord.save();
                seenPlacements.add(nextPlacement);
                console.log(`[Pipeline] Placeholder added for undetected team: ${reg.team.name}`);
            }

            session.status = 'extracted';
            session.completedAt = new Date();
            if (!extractedAny) {
                session.lastError = 'No team data could be extracted from the uploaded screenshots. Check API keys or try clearer images.';
            }
            await session.save();
            console.log('[Pipeline] Extraction complete. Status: extracted');
            return session;

        } catch (err) {
            console.error('[Pipeline] Fatal error:', err.message);
            try {
                session.status = 'failed';
                session.lastError = err.message || 'Unknown pipeline error';
                await session.save();
            } catch (saveErr) {
                console.error('[Pipeline] Could not save failed status:', saveErr.message);
            }
            return session;
        }
    }
}

module.exports = new ExtractionPipelineService();
