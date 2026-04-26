const mongoose = require('mongoose');

const extractionSessionSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  matchIndex: {
    type: Number,
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'extracted', 'reviewed', 'imported', 'failed'],
    default: 'draft'
  },
  lastError: {
    type: String,
    default: ''
  },
  screenshots: [{
    type: String, // can be base64 strings or URLs
    default: []
  }],
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExtractionSession', extractionSessionSchema);
