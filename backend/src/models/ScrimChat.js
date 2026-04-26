const mongoose = require('mongoose');

const scrimChatSchema = new mongoose.Schema({
  scrimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrim',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

scrimChatSchema.index({ scrimId: 1, createdAt: -1 });

module.exports = mongoose.model('ScrimChat', scrimChatSchema);
