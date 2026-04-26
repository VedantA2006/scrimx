const express = require('express');
const router = express.Router();
const { raiseDispute, getMyDisputes, getAllDisputes, resolveDispute } = require('../controllers/dispute.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// User/Organizer routes
router.post('/', raiseDispute);
router.get('/my', getMyDisputes);

// Admin routes
router.get('/', authorize('admin'), getAllDisputes);
router.put('/:id/resolve', authorize('admin'), resolveDispute);

module.exports = router;
