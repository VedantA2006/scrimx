const express = require('express');
const router = express.Router();
const { createReview, getOrganizerReviews } = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   POST /api/reviews/:organizerId
// @desc    Submit a review
// @access  Protected
router.post('/:organizerId', protect, createReview);

// @route   GET /api/reviews/organizer/:organizerId
// @desc    Get reviews for an organizer
// @access  Public
router.get('/organizer/:organizerId', getOrganizerReviews);

module.exports = router;
