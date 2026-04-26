const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Tournament = require('./backend/src/models/Tournament');
  const TournamentRuleSet = require('./backend/src/models/TournamentRuleSet');
  const TournamentPrizeConfig = require('./backend/src/models/TournamentPrizeConfig');
  const User = require('./backend/src/models/User');

  // Get any organizer user
  const organizer = await User.findOne({ role: 'organizer' });
  if (!organizer) { console.log('No organizer found'); process.exit(1); }

  const payload = {
    title: 'Test Tournament',
    subtitle: '',
    shortDescription: '',
    game: 'BGMI',
    tournamentType: 'Custom',
    format: 'squad',
    mode: 'tpp',
    region: 'India',
    platformType: 'Mobile',
    visibility: 'Public',
    schedule: {
      registrationOpen: '2026-04-25T01:00:00',
      registrationClose: '',
      checkInOpen: '',
      checkInClose: '',
      matchStartDate: '2026-04-25T09:15:00',
      timezone: 'Asia/Kolkata',
      isMultiDay: false,
      numberOfDays: 1
    },
    participation: { maxTeams: 100, minPlayersPerTeam: 4, maxPlayersPerTeam: 5, allowSubstitutes: true, maxSubstitutes: 1, teamsPerGroup: 20 },
    finance: { entryFee: 0, currency: 'INR', prizePoolType: 'Guaranteed', totalPrizePool: 0, platformFeePercent: 7, organizerFeePercent: 0, paymentMode: 'manual', requirePaymentProof: false, autoApproveAfterPayment: false, isRefundable: false },
    rules: { regionRestrictions: '', minAccountLevel: 0, allowedDevices: 'Mobile', bannedBehavior: 'Standard anti-cheat applies.', vpnAllowed: false, lateJoinPenalty: 'Disqualification', noShowPolicy: 'Zero points' },
    operations: { primaryChannel: 'discord', supportContact: '', autoSendRoomDetails: false, roomReleaseTimeMinutes: 15, resultSubmissionType: 'screenshot', requireVideoProof: false, provisionalResultPublish: true, disputesEnabled: true }
  };

  // Simulate the backend logic
  const schedule = {};
  const dateFields = ['registrationOpen', 'registrationClose', 'checkInOpen', 'checkInClose', 'matchStartDate', 'reportingDeadline', 'resultVerificationDeadline', 'prizePayoutDate'];
  dateFields.forEach(f => {
    if (payload.schedule?.[f]) schedule[f] = new Date(payload.schedule[f]);
  });
  if (payload.schedule?.timezone) schedule.timezone = payload.schedule.timezone;
  schedule.isMultiDay = payload.schedule.isMultiDay;
  schedule.numberOfDays = payload.schedule.numberOfDays;

  try {
    const tournament = await Tournament.create({
      organizer: organizer._id,
      title: payload.title,
      game: payload.game,
      tournamentType: payload.tournamentType,
      format: payload.format,
      mode: payload.mode,
      region: payload.region,
      platformType: payload.platformType,
      visibility: payload.visibility,
      status: 'draft',
      schedule,
      participation: payload.participation,
      finance: payload.finance,
      operations: payload.operations
    });
    console.log('✅ Tournament created:', tournament._id);

    const allowedDevicesRaw = payload.rules?.allowedDevices;
    const allowedDevices = Array.isArray(allowedDevicesRaw)
      ? allowedDevicesRaw
      : allowedDevicesRaw ? [allowedDevicesRaw] : ['Mobile'];

    const ruleSet = await TournamentRuleSet.create({
      tournamentId: tournament._id,
      eligibility: { minAccountLevel: payload.rules?.minAccountLevel || 0, allowedDevices },
      policies: {
        bannedBehavior: payload.rules?.bannedBehavior || 'Standard anti-cheat applies.',
        vpnAllowed: payload.rules?.vpnAllowed || false,
        lateJoinPenalty: payload.rules?.lateJoinPenalty || 'Disqualification',
        noShowPolicy: payload.rules?.noShowPolicy || 'Zero points'
      }
    });
    console.log('✅ RuleSet created:', ruleSet._id);

    const prizeConfig = await TournamentPrizeConfig.create({
      tournamentId: tournament._id,
      positionDeltas: []
    });
    console.log('✅ PrizeConfig created:', prizeConfig._id);

    // Cleanup
    await Tournament.deleteOne({ _id: tournament._id });
    await TournamentRuleSet.deleteOne({ _id: ruleSet._id });
    await TournamentPrizeConfig.deleteOne({ _id: prizeConfig._id });
    console.log('✅ Cleanup done. Test PASSED!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) {
      Object.entries(err.errors).forEach(([k, v]) => console.error(`  Field: ${k} => ${v.message}`));
    }
  }

  process.exit(0);
}

main().catch(console.error);
