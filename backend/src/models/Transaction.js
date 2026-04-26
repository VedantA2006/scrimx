const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'scrim_registration', 'scrim_prize', 'refund', 'fee', 'promo', 'topup'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  utr: {
    // UPI Transaction Reference — 12 alphanumeric chars
    type: String,
    default: null
  },
  referenceId: {
    type: String,
    default: null,
    index: true
  },
  referenceModel: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  balanceAfter: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
