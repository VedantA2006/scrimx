const mongoose = require('mongoose');

const tournamentAnnouncementSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  
  title: { type: String, required: true },
  body: { type: String, required: true },
  
  audience: { 
     type: String, 
     enum: ['global', 'all_registered', 'approved_only', 'checked_in_only', 'waitlist_only'], 
     default: 'global' 
  },
  
  targetGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentGroup', default: null },
  targetStageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStage', default: null },

  priority: { type: String, enum: ['normal', 'high', 'critical'], default: 'normal' },

  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }

}, { timestamps: true });

module.exports = mongoose.model('TournamentAnnouncement', tournamentAnnouncementSchema);
