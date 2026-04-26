const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['captain', 'co-captain', 'player'], default: 'player' },
  ign: { type: String, default: '' },
  uid: { type: String, default: '' },
  device: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    unique: true,
    minlength: 2,
    maxlength: 30
  },
  tag: {
    type: String,
    trim: true,
    maxlength: 6,
    uppercase: true,
    default: ''
  },
  bio: { type: String, maxlength: 500, default: '' },
  logo: { type: String, default: '' },
  banner: { type: String, default: '' },

  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [teamMemberSchema],

  // Stats
  totalScrims: { type: Number, default: 0 },
  totalMatches: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  seasonPoints: { type: Number, default: 0 },

  // Weekly leaderboard
  weeklyPoints: { type: Number, default: 0 },
  weeklyKills: { type: Number, default: 0 },
  weeklyMatches: { type: Number, default: 0 },
  weeklyPositionPoints: { type: Number, default: 0 },
  weeklyScrimIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scrim' }],
  weeklyLastReset: { type: Date, default: null },
  isWeeklyFlagged: { type: Boolean, default: false },
  weeklyFlagReason: { type: String, default: '' },
  weeklyQualified: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
  maxMembers: { type: Number, default: 4 },
  
  // Recruitment
  recruitmentMode: { type: String, enum: ['invite', 'public'], default: 'invite' },
  inviteCode: { type: String, unique: true, sparse: true },

  // Test Data Guards
  isTestData: { type: Boolean, default: false },
  testBatchId: { type: String, default: null }
}, {
  timestamps: true
});

// Auto-generate invite code on creation
teamSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = this._id.toString().slice(-6) + Math.random().toString(36).substring(2, 6);
  }
  next();
});

teamSchema.index({ name: 'text', tag: 'text' });
teamSchema.index({ _id: 1, 'members.user': 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
