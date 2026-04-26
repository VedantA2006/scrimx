const mongoose = require('mongoose');

const scoringProfileSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  name: { type: String, default: 'Standard Points' },
  killPoints: { type: Number, default: 1 },
  // placementPoints maps rank to points. E.g. [15, 12, 10, 8, 6, 4, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0]
  placementPoints: { 
    type: [Number], 
    default: [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0] 
  }
}, { timestamps: true });

module.exports = mongoose.model('ScoringProfile', scoringProfileSchema);
