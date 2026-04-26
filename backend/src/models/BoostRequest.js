const mongoose = require('mongoose');

const boostRequestSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, enum: ['scrim', 'tournament'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Not ref'd directly to allow polymorphic queries if needed
  duration: { type: String, enum: ['1day', '3day', '7day'], required: true },
  price: { type: Number, required: true },
  utr: { type: String, required: true, trim: true, uppercase: true },
  contactInfo: { type: String, trim: true },
  attachments: [{ url: String, filename: String, mimetype: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminReply: { type: String },
  rejectionReason: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('BoostRequest', boostRequestSchema);
