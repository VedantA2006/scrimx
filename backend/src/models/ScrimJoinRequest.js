const mongoose = require('mongoose');

const scrimJoinRequestSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  status: {
    type: String,
    enum: ['pending', 'chat_open', 'approved', 'rejected', 'expired', 'converted'],
    default: 'pending',
    index: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  // Private one-time invite link
  privateInviteToken: { type: String, default: null },
  privateInviteExpiresAt: { type: Date, default: null },
  privateInviteUsedAt: { type: Date, default: null },
  assignedSlotNumber: { type: Number, default: null },
  rejectionReason: { type: String, default: '' }
}, {
  timestamps: true
});

// Prevent duplicate active requests for same team + scrim
scrimJoinRequestSchema.index(
  { scrim: 1, team: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'chat_open', 'approved'] }
    }
  }
);

scrimJoinRequestSchema.index({ organizer: 1, status: 1 });
scrimJoinRequestSchema.index({ privateInviteToken: 1 }, { sparse: true });
scrimJoinRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ScrimJoinRequest', scrimJoinRequestSchema);
