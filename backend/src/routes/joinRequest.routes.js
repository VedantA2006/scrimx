const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createJoinRequest,
  getMyJoinRequests,
  getScrimJoinRequests,
  updateJoinRequestStatus,
  generateInviteLink,
  validateInviteToken,
  consumeInviteToken,
  getOrganizerJoinRequests
} = require('../controllers/joinRequest.controller');

router.use(protect);

// Player
router.post('/', createJoinRequest);
router.get('/my', getMyJoinRequests);

// Organizer
router.get('/organizer', getOrganizerJoinRequests);
router.get('/scrim/:scrimId', getScrimJoinRequests);
router.patch('/:id/status', updateJoinRequestStatus);
router.post('/:id/generate-invite', generateInviteLink);

// Invite token (auth required to verify identity)
router.get('/invite/:token/validate', validateInviteToken);
router.post('/invite/:token/consume', consumeInviteToken);

module.exports = router;
