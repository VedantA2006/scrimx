const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  against: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // E.g., The organizer or another player
  },
  reason: {
    type: String,
    enum: ['fake_results', 'no_payout', 'toxic_behavior', 'hacking', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  evidence: [{
    type: String // URLs to screenshots/videos
  }],
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved_in_favor', 'resolved_against', 'dismissed'],
    default: 'open',
    index: true
  },
  adminNotes: {
    type: String,
    default: ''
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dispute', disputeSchema);
