const mongoose = require('mongoose');

const teamApplicationSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    maxLength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// Prevent duplicate pending applications
teamApplicationSchema.index({ team: 1, player: 1, status: 1 }, { unique: true });

module.exports = mongoose.model('TeamApplication', teamApplicationSchema);
