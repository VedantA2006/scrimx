const express = require('express');
const router = express.Router();
const {
  getCurrentWeeklyLeaderboard,
  resetWeeklyLeaderboard,
  getWeeklyLeaderboardHistory
} = require('../controllers/weeklyLeaderboard.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/current', getCurrentWeeklyLeaderboard);
router.get('/history', getWeeklyLeaderboardHistory);

// Admin only
router.post('/reset', protect, authorize('admin'), resetWeeklyLeaderboard);

module.exports = router;
