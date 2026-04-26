const mongoose = require('mongoose');

const prizeDistributionSchema = new mongoose.Schema({
  position: { type: Number, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  amount: { type: Number, default: 0 },
  label: { type: String, default: '' }
}, { _id: false });

const scrimSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 100
  },
  subtitle: { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  banner: { type: String, default: '' },

  // Schedule
  date: { type: Date, required: [true, 'Date is required'], index: true },
  startTime: { type: String, required: [true, 'Start time is required'] },
  endTime: { type: String, required: [true, 'End time is required'] },
  timezone: { type: String, default: 'IST', immutable: true },

  // Match config
  numberOfMatches: { type: Number, default: 1, min: 1, max: 10 },
  matches: [{
    matchNumber: { type: Number, required: true },
    map: { type: String, required: true },
    idpTime: { type: String, required: true },
    startTime: { type: String, required: true },
    roomId: { type: String, default: '' },
    roomPassword: { type: String, default: '' },
    isIdpReleased: { type: Boolean, default: false }
  }],
  format: {
    type: String,
    enum: ['solo', 'duo', 'squad', 'tdm'],
    default: 'squad'
  },
  mode: {
    type: String,
    enum: ['tpp', 'fpp'],
    default: 'tpp'
  },

  // Slots
  slotCount: { type: Number, required: true, min: 2, max: 100 },
  filledSlots: { type: Number, default: 0 },

  // Finance
  entryFee: { type: Number, default: 0, min: 0 },
  prizePool: { type: Number, default: 0, min: 0 },
  organizerCut: { type: Number, default: 0, min: 0, max: 100 },
  platformFee: { type: Number, default: 7 },
  prizeDistribution: [prizeDistributionSchema],

  // Rules & config
  rules: { type: String, default: '' },
  roomReleaseTiming: { type: Number, default: 15 }, // minutes before match
  checkInWindow: { type: Number, default: 30 }, // minutes before match

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'registrations_open', 'full', 'locked', 'live', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Visibility & promotion
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  },
  isFeatured: { type: Boolean, default: false, index: true },
  isTrending: { type: Boolean, default: false },
  isElite: { type: Boolean, default: false, index: true },

  // Approval
  requireApproval: { type: Boolean, default: false },

  // Registration method
  registrationMethod: {
    type: String,
    enum: ['instant_join', 'request_to_join'],
    default: 'request_to_join'
  },
  registrationNote: { type: String, default: '', maxlength: 500 },
  inviteLinkExpiryMinutes: { type: Number, default: 1440 }, // 24 hours

  // Organizer notes (internal)
  organizerNotes: { type: String, default: '' },

  // Results
  resultsPublished: { type: Boolean, default: false },

  // Meta
  viewCount: { type: Number, default: 0 },
  registrationCount: { type: Number, default: 0 },

  // Revenue tracking
  earningsSummary: {
    totalPool: { type: Number, default: 0 },
    organizerShare: { type: Number, default: 0 },
    platformShare: { type: Number, default: 0 },
    calculatedAt: Date
  },

  // --- Boost / Highlight System ---
  isHighlighted: { type: Boolean, default: false },
  highlightType: { type: String, enum: ['scrim', 'tournament'] },
  highlightPlan: { type: String, enum: ['1day', '3day', '7day'] },
  highlightExpiresAt: { type: Date },
  boostScore: { type: Number, default: 0 },
  
}, {
  timestamps: true
});

// Indexes for marketplace queries
scrimSchema.index({ title: 'text', subtitle: 'text' });
scrimSchema.index({ status: 1, visibility: 1, date: -1 });
scrimSchema.index({ isElite: -1, date: -1 });
scrimSchema.index({ isFeatured: 1, status: 1 });
scrimSchema.index({ prizePool: -1 });
scrimSchema.index({ entryFee: 1 });
scrimSchema.index({ createdAt: -1 });

// Virtual for slots remaining
scrimSchema.virtual('slotsRemaining').get(function() {
  return this.slotCount - this.filledSlots;
});

scrimSchema.set('toJSON', { virtuals: true });
scrimSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Scrim', scrimSchema);
