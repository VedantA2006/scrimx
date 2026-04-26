const mongoose = require('mongoose');

const tournamentAuditLogSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Admin/Organizer who did it
  
  action: { type: String, required: true }, // e.g., 'MANUAL_SLOT_OVERRIDE', 'STAGE_PROGRESSED_MANUALLY', 'TEAM_REJECTED'
  targetEntityId: { type: mongoose.Schema.Types.ObjectId }, // The ID of the thing they edited (Group, Slot, Registration)
  
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  
  reason: { type: String, default: 'Action performed via management dashboard' },
  ipAddress: { type: String }

}, { timestamps: true, immutable: true }); // Make the collection immutable natively!

module.exports = mongoose.model('TournamentAuditLog', tournamentAuditLogSchema);
