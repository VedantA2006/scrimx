const express = require('express');
const router = express.Router();
const {
  createScrim, getScrims, getFeaturedScrims, getScrim,
  updateScrim, publishScrim, cancelScrim, releaseMatchIdp, getScrimIdps, getMyScrims, deleteScrim,
  highlightScrim, promoteScrim
} = require('../controllers/scrim.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, bannerUpload } = require('../middleware/upload.middleware');

// Public routes
router.get('/', getScrims);
router.get('/featured', getFeaturedScrims);
router.get('/:id', getScrim);

// Protected routes
router.use(protect);
router.get('/:id/idp', getScrimIdps);
router.get('/manage/my', authorize('organizer'), getMyScrims);
router.post('/', authorize('organizer'), bannerUpload.single('bannerImage'), createScrim);
router.put('/:id', authorize('organizer', 'admin'), bannerUpload.single('bannerImage'), updateScrim);
router.put('/:id/publish', authorize('organizer'), publishScrim);
router.put('/:id/matches/:matchIndex/idp', authorize('organizer'), releaseMatchIdp);
router.put('/:id/cancel', authorize('organizer', 'admin'), cancelScrim);
router.put('/:id/highlight', authorize('organizer', 'admin'), highlightScrim);
router.put('/:id/promote', authorize('organizer', 'admin'), promoteScrim);
router.delete('/:id', authorize('organizer', 'admin'), deleteScrim);

module.exports = router;
