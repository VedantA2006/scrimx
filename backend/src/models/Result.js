const mongoose = require('mongoose');

const resultTeamSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  place: {
    type: Number,
    required: true
  },
  matchScores: [{
    matchNumber: { type: Number, required: true },
    positionPoints: { type: Number, default: 0 },
    killPoints: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    playerKills: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      ign: { type: String, default: '' },
      kills: { type: Number, default: 0 }
    }]
  }],
  totalPositionPoints: {
    type: Number,
    default: 0
  },
  totalKillPoints: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  prizeWon: {
    type: Number,
    default: 0
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true,
    unique: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  matchCount: {
    type: Number,
    default: 1
  },
  standings: [resultTeamSchema],
  status: {
    type: String,
    enum: ['draft', 'pre_released', 'finalized'],
    default: 'draft'
  },
  screenshotUrl: {
    type: String,
    default: ''
  },
  matchScreenshots: {
    type: [String],
    default: []
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Result', resultSchema);
