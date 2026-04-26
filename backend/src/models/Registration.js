const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  scrim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  slotNumber: { type: Number, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'waitlisted', 'rejected', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending_verification', 'verified', 'paid', 'refunded'],
    default: 'unpaid'
  },
  amountPaid: { type: Number, default: 0 },
  utr: { type: String, default: null },           // UPI Transaction Reference
  utrNumber: { type: String, default: '' },
  utrSubmittedAt: { type: Date, default: null },
  paymentScreenshot: { type: String, default: null },
  transactionId: { type: String, default: '' },
  expiresAt: { type: Date, default: null },        // for 10-min expiry on paid registrations
  rejectionReason: { type: String, default: '' },
  joinRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrimJoinRequest'
  },
  originMethod: {
    type: String,
    enum: ['direct', 'invite_link', 'admin_force'],
    default: 'direct'
  },
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null },
  checkInTime: { type: Date },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

// Prevent duplicate registrations
registrationSchema.index({ scrim: 1, team: 1 }, { unique: true });
registrationSchema.index({ scrim: 1, registeredBy: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
