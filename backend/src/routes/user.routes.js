const express = require('express');
const router = express.Router();
const { getUsers, getUserById, toggleBan, getPlayerDashboard, getPlayerStats } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/:userId/stats', getPlayerStats);

router.use(protect);

router.get('/dashboard', getPlayerDashboard);

router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/ban', toggleBan);

module.exports = router;
