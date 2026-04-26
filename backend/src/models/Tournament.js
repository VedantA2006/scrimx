const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Step 1: Basic Information
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true },
  shortDescription: { type: String, trim: true, maxLength: 200 },
  description: { type: String, default: '' },
  game: { type: String, default: 'BGMI' },
  tournamentType: { type: String, enum: ['Scrim', 'League', 'Cup', 'Knockout', 'Qualifier', 'Invitational', 'Custom'], default: 'Custom' },
  format: { type: String, enum: ['solo', 'duo', 'squad'], default: 'squad' },
  mode: { type: String, enum: ['tpp', 'fpp', 'mixed'], default: 'tpp' },
  region: { type: String, default: 'India' },
  platformType: { type: String, enum: ['Mobile', 'Emulator', 'Cross-platform'], default: 'Mobile' },
  banner: { type: String, default: '' },
  logo: { type: String, default: '' },
  visibility: { type: String, enum: ['Public', 'Private', 'Invite-only'], default: 'Public' },
  status: { type: String, enum: ['draft', 'published', 'registrations_open', 'ongoing', 'completed', 'cancelled'], default: 'draft', index: true },
  shortCode: { type: String, index: true, unique: true, sparse: true },
  
  // Step 2: Schedule & Timeline
  schedule: {
    registrationOpen: { type: Date },
    registrationClose: { type: Date },
    checkInOpen: { type: Date },
    checkInClose: { type: Date },
    matchStartDate: { type: Date },
    reportingDeadline: { type: Date },
    resultVerificationDeadline: { type: Date },
    prizePayoutDate: { type: Date },
    timezone: { type: String, default: 'Asia/Kolkata' },
    isMultiDay: { type: Boolean, default: false },
    numberOfDays: { type: Number, default: 1 }
  },

  // Step 3: Participation Limits
  participation: {
    maxTeams: { type: Number, required: true, min: 2, default: 100 },
    minPlayersPerTeam: { type: Number, default: 4 },
    maxPlayersPerTeam: { type: Number, default: 5 },
    allowSubstitutes: { type: Boolean, default: true },
    maxSubstitutes: { type: Number, default: 1 },
    teamsPerGroup: { type: Number, default: 20 }
  },

  // Step 4: Finance
  finance: {
    entryFee: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    prizePoolType: { type: String, enum: ['Guaranteed', 'Dynamic', 'Sponsored'], default: 'Guaranteed' },
    totalPrizePool: { type: Number, default: 0 },
    platformFeePercent: { type: Number, default: 7 },
    organizerFeePercent: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['wallet', 'manual', 'hybrid'], default: 'manual' },
    requirePaymentProof: { type: Boolean, default: false },
    autoApproveAfterPayment: { type: Boolean, default: false },
    isRefundable: { type: Boolean, default: false }
  },

  // Step 6: Communications & Operations
  operations: {
    primaryChannel: { type: String, enum: ['in-app', 'whatsapp', 'discord', 'telegram', 'custom'], default: 'in-app' },
    supportContact: { type: String },
    autoSendRoomDetails: { type: Boolean, default: false },
    roomReleaseTimeMinutes: { type: Number, default: 15 },
    resultSubmissionType: { type: String, enum: ['manual', 'screenshot', 'auto', 'hybrid'], default: 'screenshot' },
    requireVideoProof: { type: Boolean, default: false },
    provisionalResultPublish: { type: Boolean, default: true },
    disputesEnabled: { type: Boolean, default: true }
  },

  // Attached Engines (Linked ref or inline references to RuleSets/Prize Configs)
  rulesEngineId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentRuleSet' },
  scoringProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScoringProfile' },

  // Social Follow Requirements
  socialRequirements: {
    requireFollow: { type: Boolean, default: false },
    requireScreenshot: { type: Boolean, default: false },
    socialLinks: {
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      discord: { type: String, default: '' },
      custom: { type: String, default: '' }
    }
  },

  // --- Boost / Highlight System ---
  isHighlighted: { type: Boolean, default: false },
  highlightType: { type: String, enum: ['scrim', 'tournament'] },
  highlightPlan: { type: String, enum: ['1day', '3day', '7day'] },
  highlightExpiresAt: { type: Date },
  boostScore: { type: Number, default: 0 }

}, { timestamps: true });

// Prevent progression anomalies
tournamentSchema.pre('validate', function(next) {
  const checkIn = this.schedule?.checkInOpen;
  const matchStart = this.schedule?.matchStartDate;
  // Only validate if both are real, valid Date objects
  if (checkIn && matchStart) {
    const ciTime = new Date(checkIn).getTime();
    const msTime = new Date(matchStart).getTime();
    if (!isNaN(ciTime) && !isNaN(msTime) && ciTime >= msTime) {
      this.invalidate('schedule.checkInOpen', 'Check-in must happen before match start');
    }
  }
  next();
});

tournamentSchema.pre('save', function(next) {
  if (!this.shortCode) {
    // Generate an uppercase TRN-XXXXXX code
    this.shortCode = 'TRN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Tournament', tournamentSchema);
