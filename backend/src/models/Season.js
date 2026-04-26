const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  number: {
    type: Number,
    required: true,
    unique: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  prizes: [{
    position: Number,
    reward: String,
    rewardType: {
      type: String,
      enum: ['cash', 'badge', 'credit'],
      default: 'cash'
    }
  }],
  // Archival data for top teams
  topTeams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    teamName: String,
    points: Number,
    rank: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Season', seasonSchema);
