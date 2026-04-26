const cron = require('node-cron');
const Tournament = require('../models/Tournament');

const initCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Executing Phase 4 Trigger Checks...');
    const now = new Date();

    try {
      // Trigger A: Open Registration
      // Find DRAFT tournaments where registrationStartDate has passed
      const readyToOpen = await Tournament.find({
        status: { $in: ['draft', 'published'] },
        registrationStartDate: { $lte: now },
        $or: [
          { registrationEndDate: { $gt: now } },
          { registrationEndDate: { $exists: false } }
        ]
      });

      for (const t of readyToOpen) {
        t.status = 'registrations_open';
        await t.save();
        console.log(`[TRIGGER A] Opened Registration for Tournament: ${t.title}`);
        // Optionally emit WebSocket event to clients
      }

      // Trigger B: Close Registration
      const readyToClose = await Tournament.find({
        status: 'registrations_open',
        registrationEndDate: { $lte: now }
      });

      for (const t of readyToClose) {
        t.status = 'ongoing'; // Proceeding to actual matches
        await t.save();
        console.log(`[TRIGGER B] Closed Registration for Tournament: ${t.title}`);
      }
      
    } catch (error) {
      console.error('[CRON ERROR] Failed executing triggers:', error);
    }
  });
};

module.exports = { initCronJobs };
