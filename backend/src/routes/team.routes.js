const express = require('express');
const router = express.Router();
const { createTeam, getMyTeams, getTeam, updateTeam, deleteTeam, addMember, removeMember, searchTeams, findPublicTeams, applyToTeam, getTeamApplications, manageApplication, sendInvite, getMyInvites, respondToInvite, getTeamByInviteCode, joinViaInviteCode, getTeamResults } = require('../controllers/team.controller');
const { protect } = require('../middleware/auth.middleware');

const { upload } = require('../middleware/upload.middleware');

// Public routes
router.get('/search', searchTeams);
router.get('/public', findPublicTeams);
router.get('/invite-link/:inviteCode', getTeamByInviteCode);

// Protected named routes
router.use(protect);
router.post('/', upload.single('logoImage'), createTeam);
router.get('/manage/my', getMyTeams);
router.get('/invites/my', getMyInvites);
router.put('/invites/:inviteId', respondToInvite);
router.post('/invite-link/:inviteCode/join', joinViaInviteCode);
router.put('/applications/:appId', manageApplication);

// Wildcard param routes (MUST be after named routes)
router.get('/:id', getTeam);
router.get('/:id/results', getTeamResults);
router.put('/:id', upload.single('logoImage'), updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/members', addMember);
router.post('/:id/invite', sendInvite);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/apply', applyToTeam);
router.get('/:id/applications', getTeamApplications);

module.exports = router;
