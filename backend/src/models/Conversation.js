const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['scrim_inquiry', 'tournament_inquiry', 'organizer_admin', 'support', 'direct'],
    default: 'scrim_inquiry'
  },
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim'
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  joinRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrimJoinRequest'
  },
  lastMessage: {
    text: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  // Map of participantId => unread count
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ scrim: 1, joinRequest: 1 });
conversationSchema.index({ type: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
