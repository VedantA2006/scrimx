const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'adjustment'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  relatedScrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    default: null
  },
  relatedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrganizerPointRequest',
    default: null
  },
  createdByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OrganizerPointTransaction', pointTransactionSchema);
