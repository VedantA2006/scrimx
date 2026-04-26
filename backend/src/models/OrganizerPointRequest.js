const mongoose = require('mongoose');

const pointRequestSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestedPoints: {
    type: Number,
    required: true,
    min: 1
  },
  utr: {
    type: String,
    required: [true, 'UTR is required'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{12}$/i, 'UTR must be exactly 12 alphanumeric characters']
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  attachment: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  adminResponse: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OrganizerPointRequest', pointRequestSchema);
