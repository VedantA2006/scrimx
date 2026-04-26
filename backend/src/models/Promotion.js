const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['highlight', 'top_spot', 'homepage_banner'],
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Promotion', promotionSchema);
