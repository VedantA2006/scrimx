const mongoose = require('mongoose');

const tournamentGroupSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStage' }, // Optional now
  name: { type: String, required: true }, // e.g. "Group A"
  promotionCount: { type: Number, default: 0 }, // Top N to qualify
  status: { type: String, enum: ['pending', 'playing', 'completed'], default: 'pending' },
  teamsLimit: { type: Number, required: true },
  // 'auto' = approved teams seeded automatically | 'invite' = paid/LCQ join-on-invite
  joinMode: { type: String, enum: ['auto', 'invite'], default: 'auto' },
  // Invite link system for paid/LCQ stages
  inviteToken: { type: String, default: null, index: true },
  inviteExpiresAt: { type: Date, default: null },
  // Multi-invite: per-slot unique tokens for Grand Final / Paid groups
  multiInviteTokens: [{
    token: { type: String, required: true },
    slotNumber: { type: Number },
    claimedByTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }]
}, { timestamps: true });

module.exports = mongoose.model('TournamentGroup', tournamentGroupSchema);

