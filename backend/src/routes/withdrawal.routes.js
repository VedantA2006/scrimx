const express = require('express');
const router = express.Router();
const { requestWithdrawal, getMyWithdrawals, getAllWithdrawals, processWithdrawal } = require('../controllers/withdrawal.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// User routes
router.post('/', requestWithdrawal);
router.get('/my', getMyWithdrawals);

// Admin routes
router.get('/', authorize('admin'), getAllWithdrawals);
router.put('/:id/process', authorize('admin'), processWithdrawal);

module.exports = router;
