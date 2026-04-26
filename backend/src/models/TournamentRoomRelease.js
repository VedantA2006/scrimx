const mongoose = require('mongoose');

const tournamentRoomReleaseSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentGroup', required: true, index: true }, // The lobby matrix link
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStage' },
  
  roomId: { type: String, required: true },
  roomPassword: { type: String, required: true },
  
  matchNumber: { type: Number, default: 1, min: 1 }, // Support multiple matches per group
  
  serverRegion: { type: String, default: 'India' },
  mapName: { type: String, default: 'Erangel' },
  
  // Timing / Visibility Rules
  isReleased: { type: Boolean, default: false },
  releaseTime: { type: Date }, // If auto-release is enabled

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Allow one credential block per group per match number
tournamentRoomReleaseSchema.index({ tournamentId: 1, groupId: 1, matchNumber: 1 }, { unique: true });

module.exports = mongoose.model('TournamentRoomRelease', tournamentRoomReleaseSchema);
