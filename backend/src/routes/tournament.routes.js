const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, memoryUpload } = require('../middleware/upload.middleware');
const tournamentController = require('../controllers/tournament.controller');
const playerPortalController = require('../controllers/playerPortal.controller');

// Public proxy route
router.get('/public', tournamentController.getPublicTournaments);
router.get('/public/:id', tournamentController.getPublicTournamentById);

// Player Portal Data (Protected but accessible to players)
router.get('/:id/public-roadmap', protect, playerPortalController.getPublicRoadmap);
router.get('/:id/groups/:groupId/match-rooms', protect, playerPortalController.getGroupMatchRooms);
router.get('/:id/chat-history', protect, playerPortalController.getTournamentChatHistory);
router.get('/:id/groups/:groupId/chat-history', protect, playerPortalController.getGroupChatHistory);

// Protected routes
router.use(protect);

router.get('/my-participating', tournamentController.getMyParticipatingTournaments);
router.get('/my-tournaments', authorize('organizer', 'admin'), tournamentController.getMyTournaments);

router.post('/:id/register', tournamentController.registerForTournament);

router.get('/:id/overview', authorize('organizer', 'admin'), tournamentController.getTournamentOverview);

router.post('/', authorize('organizer', 'admin'), tournamentController.createTournament);
router.post('/enterprise', authorize('organizer', 'admin'), tournamentController.createEnterpriseTournament);
router.post('/upload-banner', authorize('organizer', 'admin'), upload.single('banner'), tournamentController.uploadTournamentBanner);
router.post('/upload-proof', protect, upload.single('proof'), tournamentController.uploadProof);
router.post('/:id/scaffold', authorize('organizer', 'admin'), tournamentController.generateScaffolding);
router.post('/:id/scaffold-roadmap', authorize('organizer', 'admin'), tournamentController.scaffoldRoadmap);
router.post('/:id/publish', authorize('organizer', 'admin'), tournamentController.publishTournament);

// Phase 1 Operations: Registrations & Slots
router.get('/:id/registrations', authorize('organizer', 'admin'), tournamentController.getTournamentRegistrations);
router.put('/:id/registrations/bulk-approve', authorize('organizer', 'admin'), tournamentController.bulkApproveRegistrations);
router.delete('/:id/registrations/bulk-delete', authorize('organizer', 'admin'), tournamentController.bulkDeleteRegistrations);
router.put('/:id/registrations/:regId/status', authorize('organizer', 'admin'), tournamentController.updateRegistrationStatus);
router.put('/:id/registrations/:regId/check-in', authorize('organizer', 'admin'), tournamentController.overrideCheckInStatus);
router.post('/:id/checkin/close-window', authorize('organizer', 'admin'), tournamentController.closeCheckInAndPromote);
router.get('/:id/slots', authorize('organizer', 'admin'), tournamentController.getTournamentSlots);
router.post('/:id/slots/auto-seed', authorize('organizer', 'admin'), tournamentController.autoSeedSlots);
router.put('/:id/slots/swap', authorize('organizer', 'admin'), tournamentController.swapSlots);
router.put('/:id/slots/:slotId/remove-team', authorize('organizer', 'admin'), tournamentController.removeTeamFromSlot);

// Manual Group Management
router.post('/:id/groups', authorize('organizer', 'admin'), tournamentController.createTournamentGroup);
router.put('/:id/groups/:groupId', authorize('organizer', 'admin'), tournamentController.updateTournamentGroup);
router.delete('/:id/groups/:groupId', authorize('organizer', 'admin'), tournamentController.deleteTournamentGroup);
router.post('/:id/groups/:groupId/add-teams', authorize('organizer', 'admin'), tournamentController.addTeamsToGroup);

// Phase 2 Operations: Stages, Results, and Match Execution
router.get('/:id/rooms', authorize('organizer', 'admin'), tournamentController.getTournamentRooms);
router.post('/:id/rooms', authorize('organizer', 'admin'), tournamentController.saveTournamentRoom);
router.delete('/:id/rooms/:roomId', authorize('organizer', 'admin'), tournamentController.deleteTournamentRoom);
router.get('/:id/stages', authorize('organizer', 'admin'), tournamentController.getTournamentStages);
router.post('/:id/stages/advance', authorize('organizer', 'admin'), tournamentController.advanceTournamentStage);
router.post('/:id/stages/v2', authorize('organizer', 'admin'), tournamentController.createSimpleStage);
router.put('/:id/stages/:stageId/connect', authorize('organizer', 'admin'), tournamentController.connectStage);
router.post('/:id/stages/:stageId/import-teams', authorize('organizer', 'admin'), tournamentController.importRegisteredTeams);
router.delete('/:id/stages/:stageId', authorize('organizer', 'admin'), tournamentController.deleteStage);
router.post('/:id/stages/roadmap', authorize('organizer', 'admin'), tournamentController.saveTournamentRoadmap);
router.post('/:id/stages/ai-generate', authorize('organizer', 'admin'), tournamentController.generateRoadmapViaAI);
router.post('/:id/stages/:stageId/generate', authorize('organizer', 'admin'), tournamentController.generateNextStageLogic);

router.get('/:id/results', authorize('organizer', 'admin'), tournamentController.getTournamentResults);
router.post('/:id/results', authorize('organizer', 'admin'), tournamentController.submitTournamentResults);
router.get('/:id/groups/:groupId/results', authorize('organizer', 'admin'), tournamentController.getGroupResults);
router.put('/:id/groups/:groupId/qualify/:teamId', authorize('organizer', 'admin'), tournamentController.toggleTeamQualification);
router.post('/:id/groups/:groupId/promote-top', authorize('organizer', 'admin'), tournamentController.promoteTopTeams);
router.post('/:id/groups/:groupId/auto-promote', authorize('organizer', 'admin'), tournamentController.autoPromoteFromRoadmap);
// Invite links: organizer generates, teams join publicly
router.post('/:id/groups/:groupId/invite-link', authorize('organizer', 'admin'), tournamentController.generateGroupInviteLink);
router.post('/:id/groups/:groupId/multi-invite', authorize('organizer', 'admin'), tournamentController.generateMultiInviteLinks);
router.get('/join-invite/:token', tournamentController.getInviteLinkDetails);
router.post('/join-invite/:token', authorize('player', 'organizer', 'admin'), tournamentController.joinViaInviteLink);
// Email notification: send to all players in this group (supports file attachments)
router.post('/:id/groups/:groupId/notify-email', authorize('organizer', 'admin'), memoryUpload.array('attachments', 5), tournamentController.sendGroupEmailNotification);

// Phase 3 Operations: Finance & Broadcast
router.post('/:id/broadcast', authorize('organizer', 'admin'), memoryUpload.array('attachments', 5), tournamentController.broadcastAnnouncement);
router.get('/:id/finance', authorize('organizer', 'admin'), tournamentController.getTournamentFinance);

// Prize Pool Distribution
router.get('/:id/prize-config', authorize('organizer', 'admin'), tournamentController.getPrizeConfig);
router.post('/:id/prize-config', authorize('organizer', 'admin'), tournamentController.savePrizeConfig);
router.post('/:id/results/publish', authorize('organizer', 'admin'), tournamentController.publishGroupResults);

// Phase 6: Disputes, Lifecycle, Player Portal
router.get('/:id/disputes', authorize('organizer', 'admin'), tournamentController.getTournamentDisputes);
router.post('/:id/disputes', protect, tournamentController.createDispute);
router.put('/:id/disputes/:disputeId/resolve', authorize('organizer', 'admin'), tournamentController.resolveDispute);
router.post('/:id/close', authorize('organizer', 'admin'), tournamentController.closeTournament);
router.get('/:id/my-status', protect, tournamentController.getMyTournamentStatus);
router.post('/:id/checkin', protect, tournamentController.playerCheckIn);

module.exports = router;
