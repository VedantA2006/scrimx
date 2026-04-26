const mongoose = require('mongoose');

const tournamentRuleSetSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  
  generalRules: { type: String, default: '' },
  matchRules: { type: String, default: '' },
  
  eligibility: {
    regionRestrictions: [{ type: String }],
    minAccountLevel: { type: Number, default: 0 },
    allowedDevices: [{ type: String, enum: ['Mobile', 'Tablet', 'Emulator'], default: ['Mobile', 'Tablet'] }],
    accountAgeDays: { type: Number, default: 0 }
  },

  policies: {
    bannedBehavior: { type: String, default: 'Standard anti-cheat applies.' },
    vpnAllowed: { type: Boolean, default: false },
    lateJoinPenalty: { type: String, default: 'Disqualification' },
    noShowPolicy: { type: String, default: 'Zero points for match' },
    disputePolicy: { type: String, default: 'Submit unedited POV recording within 15 mins' }
  },
  
  termsAcceptedRequired: { type: Boolean, default: true },
  version: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('TournamentRuleSet', tournamentRuleSetSchema);
