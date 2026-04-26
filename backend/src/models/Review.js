const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: 500
  }
}, {
  timestamps: true
});

// Prevent same player from reviewing the same organizer multiple times
reviewSchema.index({ organizer: 1, player: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
