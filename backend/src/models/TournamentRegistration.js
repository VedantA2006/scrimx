const mongoose = require('mongoose');

const tournamentRegistrationSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The captain who registered
  
  status: { 
    type: String, 
    enum: ['pending', 'payment_verification', 'approved', 'waitlist', 'rejected', 'withdrawn'], 
    default: 'pending',
    index: true
  },
  
  // Phase 1 Core Additions
  waitlistRank: { type: Number, default: 0 },
  checkInStatus: { 
    type: String, 
    enum: ['pending', 'checked-in', 'no-show'], 
    default: 'pending',
    index: true
  },

  
  paymentMode: { type: String, enum: ['wallet', 'manual', 'free'], default: 'free' },
  paymentProofImage: { type: String },
  transactionId: { type: String },
  followProofImage: { type: String },
  
  // Custom Roster explicitly locked into this registration at the time of entry
  roster: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inGameName: { type: String, required: true },
    inGameId: { type: String, required: true },
    role: { type: String, enum: ['captain', 'player', 'substitute'], default: 'player' }
  }],
  
  termsAccepted: { type: Boolean, required: true },
  organizerNotes: { type: String, default: '' }, // Internal notes for rejection reasons etc.

  // Test Data Guards
  isTestData: { type: Boolean, default: false },
  testBatchId: { type: String, default: null }

}, { timestamps: true });

// A team can only register once per tournament
tournamentRegistrationSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('TournamentRegistration', tournamentRegistrationSchema);
