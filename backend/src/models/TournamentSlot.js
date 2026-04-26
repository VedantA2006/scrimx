const mongoose = require('mongoose');

const tournamentSlotSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentGroup', required: true, index: true },
  occupyingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  slotNumber: { type: Number, required: true },
  status: { type: String, enum: ['empty', 'filled'], default: 'empty' },
  isReserved: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure unique slot numeric IDs within a specific group
tournamentSlotSchema.index({ groupId: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('TournamentSlot', tournamentSlotSchema);
