const express = require('express');
const router = express.Router();
const { getPaymentSettings } = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/payment', protect, getPaymentSettings);

module.exports = router;
