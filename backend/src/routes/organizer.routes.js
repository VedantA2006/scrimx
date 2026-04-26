const express = require('express');
const router = express.Router();
const { updateOrganizerProfile, getOrganizerBySlug, getOrganizers, verifyOrganizer } = require('../controllers/organizer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const { upload } = require('../middleware/upload.middleware');

router.get('/', getOrganizers);
router.get('/:slug', getOrganizerBySlug);

router.use(protect);
router.put('/profile', 
  authorize('organizer'), 
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }, { name: 'avatar', maxCount: 1 }]), 
  updateOrganizerProfile
);
router.put('/:id/verify', authorize('admin'), verifyOrganizer);

module.exports = router;
