const mongoose = require('mongoose');

const extractedTeamResultSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExtractionSession',
    required: true,
    index: true
  },
  placement: {
    type: Number,
    required: true
  },
  matchedSlotNumber: {
    type: Number,
    default: null
  },
  matchedTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  matchedTeamName: {
    type: String,
    default: ''
  },
  teamConfidence: {
    type: String,
    enum: ['high', 'medium', 'low', 'none'],
    default: 'none'
  },
  teamConfidenceScore: {
    type: Number,
    default: 0
  },
  positionPoints: {
    type: Number,
    default: 0
  },
  teamKills: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  sourceScreenshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExtractionScreenshot',
    default: null
  },
  sourceBlockIndex: {
    type: Number,
    default: 0
  },
  usedVLM: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExtractedTeamResult',
    default: null
  },
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'imported'],
    default: 'pending_review'
  },
  wasEdited: {
    type: Boolean,
    default: false
  },
  auditTrail: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExtractedTeamResult', extractedTeamResultSchema);
