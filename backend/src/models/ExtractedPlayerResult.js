const mongoose = require('mongoose');

const extractedPlayerResultSchema = new mongoose.Schema({
  teamResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExtractedTeamResult',
    required: true,
    index: true
  },
  ocrName: {
    type: String,
    default: ''
  },
  vlmRefinedName: {
    type: String,
    default: ''
  },
  matchedPlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  matchedPlayerName: {
    type: String,
    default: ''
  },
  kills: {
    type: Number,
    default: 0
  },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low', 'none'],
    default: 'none'
  },
  usedVLM: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected'],
    default: 'pending_review'
  },
  wasEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExtractedPlayerResult', extractedPlayerResultSchema);
