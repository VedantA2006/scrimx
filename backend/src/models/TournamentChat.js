const mongoose = require('mongoose');

const tournamentChatSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentGroup',
    default: null,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  type: {
    type: String,
    enum: ['message', 'announcement', 'system'],
    default: 'message'
  },
  attachment: {
    type: String,
    default: null
  },
  scope: {
    type: String,
    enum: ['tournament', 'group'],
    default: 'tournament'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
tournamentChatSchema.index({ tournamentId: 1, scope: 1, createdAt: 1 });
tournamentChatSchema.index({ groupId: 1, createdAt: 1 });

module.exports = mongoose.model('TournamentChat', tournamentChatSchema);
