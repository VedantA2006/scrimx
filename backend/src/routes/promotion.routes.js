const express = require('express');
const router = express.Router();
const { buyPromotion, getScrimPromotions, getActiveBanners } = require('../controllers/promotion.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/banners', getActiveBanners);

// Protected routes
router.use(protect);
router.post('/', authorize('organizer'), buyPromotion);
router.get('/scrim/:scrimId', authorize('organizer', 'admin'), getScrimPromotions);

module.exports = router;
