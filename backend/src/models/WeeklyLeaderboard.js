const mongoose = require('mongoose');

const weeklyEntrySchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  teamName: { type: String, default: '' },
  teamTag: { type: String, default: '' },
  teamLogo: { type: String, default: '' },
  weeklyPoints: { type: Number, default: 0 },
  weeklyKills: { type: Number, default: 0 },
  weeklyMatches: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  qualified: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' }
}, { _id: false });

const weeklyLeaderboardSchema = new mongoose.Schema({
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  status: { type: String, enum: ['active', 'closed', 'qualified'], default: 'active' },
  prizePool: { type: Number, default: 5000 },
  entries: [weeklyEntrySchema],
  sundayTournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null }
}, {
  timestamps: true
});

weeklyLeaderboardSchema.index({ weekStart: -1 });

module.exports = mongoose.model('WeeklyLeaderboard', weeklyLeaderboardSchema);
