const User = require('../models/User');
const Review = require('../models/Review');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');
const mongoose = require('mongoose');

// @desc    Submit a review for an organizer
// @route   POST /api/reviews/:organizerId
const createReview = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { rating, comment } = req.body;
    const organizerId = req.params.organizerId;
    const playerId = req.user._id;

    if (organizerId === playerId.toString()) {
      throw new AppError('You cannot review yourself', 400);
    }

    const organizer = await User.findOne({ _id: organizerId, role: 'organizer' }).session(session);
    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    // Check if player already reviewed
    const existingReview = await Review.findOne({ organizer: organizerId, player: playerId }).session(session);
    if (existingReview) {
      throw new AppError('You have already reviewed this organizer', 400);
    }

    const review = new Review({
      organizer: organizerId,
      player: playerId,
      rating: Number(rating),
      comment
    });

    await review.save({ session });

    // Update the organizer's total rating directly using an aggregation pipeline to be precise
    const stats = await Review.aggregate([
      { $match: { organizer: new mongoose.Types.ObjectId(organizerId) } },
      { $group: { _id: '$organizer', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).session(session);

    if (stats.length > 0) {
      organizer.organizerProfile.rating = Math.round(stats[0].avgRating * 10) / 10;
      organizer.organizerProfile.ratingCount = stats[0].count;
      await organizer.save({ session });
    }

    await session.commitTransaction();
    
    // Populate player info for immediate return
    await review.populate('player', 'username avatar ign');

    sendResponse(res, 201, { message: 'Review submitted successfully', review });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all reviews for an organizer
// @route   GET /api/reviews/organizer/:organizerId
const getOrganizerReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const organizerId = req.params.organizerId;
    
    const query = { organizer: organizerId };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Review.countDocuments(query);
    
    const reviews = await Review.find(query)
      .populate('player', 'username avatar ign')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));
      
    sendPaginated(res, 200, { reviews }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getOrganizerReviews };
