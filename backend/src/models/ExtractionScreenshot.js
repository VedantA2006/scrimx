const mongoose = require('mongoose');

const extractionScreenshotSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExtractionSession',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  uploadOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExtractionScreenshot', extractionScreenshotSchema);
