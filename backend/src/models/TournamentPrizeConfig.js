const mongoose = require('mongoose');

const tournamentPrizeConfigSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  
  positionDeltas: [{
    position: { type: Number, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    label: { type: String, default: '' } // e.g. Champion
  }],

  bonusRewards: {
    mvpPercent: { type: Number, default: 0 },
    topFraggerPercent: { type: Number, default: 0 },
    perKillAmount: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Ensure total percentages strictly do not exceed 100%
tournamentPrizeConfigSchema.pre('save', function(next) {
  const sumPositions = this.positionDeltas.reduce((acc, curr) => acc + curr.percentage, 0);
  const total = sumPositions + this.bonusRewards.mvpPercent + this.bonusRewards.topFraggerPercent;
  
  if (total > 100) {
    next(new Error(`Total prize distribution config exceeds 100%. Got ${total}%`));
  } else {
    next();
  }
});

module.exports = mongoose.model('TournamentPrizeConfig', tournamentPrizeConfigSchema);
