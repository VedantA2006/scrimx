const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, default: '' },
  mimetype: { type: String, default: '' },
  size: { type: Number, default: 0 }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'invite_link'],
    default: 'text'
  },
  content: {
    type: String,
    default: '',
    maxlength: 5000
  },
  attachments: [attachmentSchema],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
