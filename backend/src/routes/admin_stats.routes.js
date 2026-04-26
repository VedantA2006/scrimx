const express = require('express');
const router = express.Router();
const { getPlatformStats, getRecentActivity } = require('../controllers/admin_stats.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getPlatformStats);
router.get('/activity', getRecentActivity);

module.exports = router;
