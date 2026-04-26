const mongoose = require('mongoose');

const tournamentStageSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  name: { type: String, required: true }, // e.g. "Round 1 - Qualifiers", "Semi-Finals"
  order: { type: Number, required: true }, // Numeric sort
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  
  // Phase 7: Interactive Stage Roadmap Builder
  // Phase 7: Interactive Stage Roadmap Builder
  type: { type: String, enum: ["registration", "qualifier", "semi", "final", "custom", "wildcard"], default: "custom" },
  stageCategory: { type: String, enum: ["free", "paid"], default: "free" },
  totalTeams: { type: Number, default: 0 },
  groups: { type: Number, default: 1 },
  teamsPerGroup: { type: Number, default: 20 },
  qualificationType: { type: String, enum: ["top_per_group", "top_overall", "manual"], default: "top_per_group" },
  promotionCount: { type: Number, default: 0 }, // Replaces legacy qualificationCount
  
  // Graph Logic
  inputSources: [{ type: String }],
  outputTargets: [{ type: String }],
  promotionRoutes: [{ 
    targetId: { type: String },
    rankStart: { type: Number, default: 1 },
    rankEnd: { type: Number, default: 10 }
  }],
  pendingTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }], // Waiting pool for merge logic
  
  autoSeed: { type: Boolean, default: false },
  autoPromote: { type: Boolean, default: false },
  
  // Visual placement in React Flow Canvas
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('TournamentStage', tournamentStageSchema);
