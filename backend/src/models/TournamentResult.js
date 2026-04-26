const mongoose = require('mongoose');

const tournamentParticipantScoreSchema = new mongoose.Schema({
   teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
   
   // Raw Match Input Stats
   matchesPlayed: { type: Number, default: 0 },
   totalKills: { type: Number, default: 0 },
   placementPoints: { type: Number, default: 0 },
   killPoints: { type: Number, default: 0 },
   
   // Modifiers (Penalties/Bonuses from Disputes)
   penalties: { type: Number, default: 0 },
   bonuses: { type: Number, default: 0 },
   
   // Mathematical Sum
   totalPoints: { type: Number, default: 0 },

   // Computed Output
   rank: { type: Number, default: 0 },
   isQualifiedForNextStage: { type: Boolean, default: false },
   promotedToStageId: { type: String, default: null }, // Which roadmap stage this team advances to

   // Proof logic / Verifications
   teamSubmittedProofImage: { type: String, default: null },
   organizerNotes: { type: String, default: '' }
}, { _id: false });

const tournamentResultSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStage' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentGroup', index: true }, // Optional if it's a global leaderboard stage
  
  status: { type: String, enum: ['draft', 'provisional', 'final', 'disputed'], default: 'draft' },
  
  standings: [tournamentParticipantScoreSchema],

  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date }
  
}, { timestamps: true });

// Prevent dupe results per lobby
// tournamentResultSchema.index({ tournamentId: 1, stageId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('TournamentResult', tournamentResultSchema);
