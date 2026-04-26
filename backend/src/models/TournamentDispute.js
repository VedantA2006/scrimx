const mongoose = require('mongoose');

const tournamentDisputeSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  
  // Who filed it
  filedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  
  // What match/group it concerns
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentGroup' },
  stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentStage' },

  category: { 
    type: String, 
    enum: ['wrong_placement', 'kill_count_error', 'technical_issue', 'cheating_report', 'other'], 
    required: true 
  },
  
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // Evidence: screenshot URLs, video links, etc.
  evidenceUrls: { type: [String], default: [] },
  
  status: { type: String, enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open', index: true },
  
  // Organizer resolution
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolution: { type: String, default: '' },
  resolvedAt: { type: Date },

  // Priority flag from organizer
  priority: { type: String, enum: ['normal', 'high'], default: 'normal' }

}, { timestamps: true });

module.exports = mongoose.model('TournamentDispute', tournamentDisputeSchema);
