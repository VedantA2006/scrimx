const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getSession, uploadScreenshot, removeScreenshotByUrl, startExtraction, stopExtraction, getResults, updateTeamResult, updatePlayerResult, importToDeclareResults } = require('../controllers/extraction.controller');

// Per-route timeout for AI pipeline (3 minutes)
const slowTimeout = (req, res, next) => {
  req.setTimeout(180000);
  res.setTimeout(180000);
  next();
};

// Need to protect all with organizer auth
router.use(protect);

router.get('/scrim/:scrimId/match/:matchIndex/session', getSession);
router.post('/session/:sessionId/upload', uploadScreenshot);
router.post('/session/:sessionId/screenshot/remove', removeScreenshotByUrl);

router.post('/session/:sessionId/extract', slowTimeout, startExtraction);
router.post('/session/:sessionId/stop', stopExtraction);
router.get('/session/:sessionId/results', getResults);

router.put('/team-result/:id', updateTeamResult);
router.put('/player-result/:id', updatePlayerResult);

router.post('/session/:sessionId/import', importToDeclareResults);

module.exports = router;
