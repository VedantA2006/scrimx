const express = require('express');
const router  = express.Router();
const { sendOtp, getTelegramStatus } = require('../controllers/telegram.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/send-otp',   authorize('organizer'), sendOtp);
router.get('/status',      authorize('organizer'), getTelegramStatus);

module.exports = router;
