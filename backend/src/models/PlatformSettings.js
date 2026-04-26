const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  adminUpiId: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
