const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 50
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'failed'],
    default: 'pending',
    index: true
  },
  method: {
    type: String,
    enum: ['upi', 'bank_transfer'],
    required: true
  },
  payoutDetails: {
    upiId: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String }
  },
  transactionId: {
    type: String, // Bank/UPI Reference ID or transaction ID
    default: ''
  },
  utrNumber: {
    type: String, // The UTR number for manual payouts
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
