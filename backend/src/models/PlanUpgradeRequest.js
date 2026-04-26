const mongoose = require('mongoose');

const planUpgradeRequestSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestedPlan: {
    type: String,
    enum: ['elite'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  contactInfo: {
    type: String,
    trim: true,
    default: ''
  },
  utr: {
    type: String,
    trim: true,
    required: true
  },
  attachments: [{
    url: { type: String, required: true },
    filename: { type: String, default: '' },
    mimetype: { type: String, default: '' }
  }],
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  // Admin fields
  adminReply: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  activatedAt: { type: Date },
  expiresAt: { type: Date },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

planUpgradeRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PlanUpgradeRequest', planUpgradeRequestSchema);
