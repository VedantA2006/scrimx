const express = require('express');
const router = express.Router();
const { submitResults, preReleaseResults, publishResults, getResults, getLeaderboard, submitDispute, getScrimDisputes, getPlayerKillsLeaderboard, getMyResults } = require('../controllers/result.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Public
router.get('/leaderboard/players', getPlayerKillsLeaderboard);
router.get('/leaderboard', getLeaderboard);

// Protected
router.use(protect);
router.get('/my', getMyResults);
router.get('/scrim/:scrimId', getResults);
router.post('/scrim/:scrimId', authorize('organizer', 'admin'), upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'matchScreenshots', maxCount: 10 }
]), submitResults);
router.put('/scrim/:scrimId/pre-release', authorize('organizer', 'admin'), preReleaseResults);
router.put('/scrim/:scrimId/publish', authorize('organizer', 'admin'), publishResults);
router.post('/scrim/:scrimId/dispute', submitDispute);
router.get('/scrim/:scrimId/disputes', getScrimDisputes);

module.exports = router;
