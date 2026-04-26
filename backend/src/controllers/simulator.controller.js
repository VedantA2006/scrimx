const User = require('../models/User');
const Team = require('../models/Team');
const TournamentRegistration = require('../models/TournamentRegistration');
const Tournament = require('../models/Tournament');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Utility to generate a unique batch string identifying the testing block
const generateBatchId = () => `BATCH_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

exports.generateFakeUsers = async (req, res) => {
  try {
     const { count = 10, withWallet = true } = req.body;
     const batchId = generateBatchId();
     const hashedPassword = bcrypt.hashSync('password123', 12);
     const fakeUsers = [];
     const sampleCredentials = [];

     for (let i = 0; i < count; i++) {
        const str = crypto.randomBytes(3).toString('hex');
        const email = `test_${str}@sim.scrimx.com`;
        
        if (i < 5) sampleCredentials.push({ email, password: 'password123' });

        fakeUsers.push({
           username: `Test_${str}`,
           email: email,
           password: hashedPassword, // Explicitly hashed so logins work natively
           ign: `IGN_${str}`,
           uid: `UID${Math.floor(100000 + Math.random() * 900000)}`,
           role: 'player',
           wallet: withWallet ? { balance: Math.floor(Math.random() * 5000), pendingBalance: 0 } : { balance: 0 },
           isTestData: true,
           testBatchId: batchId,
           testType: 'player'
        });
     }

     await User.insertMany(fakeUsers); 

     res.status(201).json({ success: true, message: `Injected ${count} test players.`, data: { batchId, count, sampleCredentials } });
  } catch(err) {
     res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateFakeTeams = async (req, res) => {
  try {
     const { count = 5 } = req.body;
     const batchId = generateBatchId();
     
     // Find un-teamed fake users mathematically
     const allFakeUsers = await User.find({ isTestData: true, testType: 'player' }).limit(count * 5); // Assumes squad size 4-5
     if (allFakeUsers.length < count * 4) return res.status(400).json({ success: false, message: 'Not enough fake players to sustain this team volume. Run User gen first.' });

     const fakeTeams = [];
     const createdTeamsData = [];
     let userIndex = 0;

     for (let i = 0; i < count; i++) {
        const teamHash = crypto.randomBytes(2).toString('hex').toUpperCase();
        const captain = allFakeUsers[userIndex++];
        
        const roster = [
           { user: captain._id, role: 'captain', ign: captain.ign, uid: captain.uid }
        ];

        // Pick 3 random players for squad
        for (let j = 0; j < 3; j++) {
           const p = allFakeUsers[userIndex++];
           roster.push({ user: p._id, role: 'player', ign: p.ign, uid: p.uid });
        }

        fakeTeams.push({
           name: `SIM SQUAD ${teamHash}`,
           tag: teamHash,
           captain: captain._id,
           members: roster,
           isTestData: true,
           testBatchId: batchId
        });

        createdTeamsData.push({
           teamName: `SIM SQUAD ${teamHash}`,
           captainEmail: captain.email,
           captainPassword: 'password123'
        });
     }

     await Team.insertMany(fakeTeams);

     res.status(201).json({ success: true, message: `Injected ${count} test squads.`, data: { batchId, count, createdTeamsData } });
  } catch(err) {
     res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkRegisterTeams = async (req, res) => {
  try {
     const { tournamentId, count = 5, statusOverride } = req.body;
     const batchId = generateBatchId();

     const cleanedId = tournamentId.trim();
     const isMongoId = cleanedId.match(/^[0-9a-fA-F]{24}$/);
     const query = isMongoId ? { _id: cleanedId } : { shortCode: cleanedId };

     const tournament = await Tournament.findOne(query);
     if (!tournament) return res.status(404).json({ success: false, message: 'Target matrix missing' });

     // Fetch fake teams that ARE NOT registered to this tournament yet
     const registeredTeamIds = await TournamentRegistration.find({ tournamentId: tournament._id }).distinct('teamId');
     const availableFakeTeams = await Team.find({ 
        isTestData: true, 
        _id: { $nin: registeredTeamIds } 
     }).populate('members.user').limit(count);

     if (availableFakeTeams.length === 0) return res.status(400).json({ success: false, message: 'No free test teams available.' });

     const injectables = [];
     
     for (const t of availableFakeTeams) {
        // Construct the rigid roster hook required by TournamentRegistration schema
        const mappedRoster = t.members.map(m => ({
           playerId: m.user._id,
           inGameName: m.ign,
           inGameId: m.uid,
           role: m.role
        }));

        injectables.push({
           tournamentId: tournament._id,
           teamId: t._id,
           userId: t.captain, // captain injecting
           status: statusOverride || 'pending',
           paymentMode: (tournament.finance && tournament.finance.entryFee > 0) ? 'wallet' : 'free',
           roster: mappedRoster,
           termsAccepted: true,
           isTestData: true,
           testBatchId: batchId
        });
     }

     await TournamentRegistration.insertMany(injectables);

     res.status(201).json({ success: true, message: `Vaporized ${injectables.length} squad injections into target matrix.` });
  } catch(err) {
     res.status(500).json({ success: false, message: err.message });
  }
};

exports.nukeTestEntities = async (req, res) => {
  try {
     const { batchId } = req.body; // optional. If null, destroy ALL matching isTestData

     const query = { isTestData: true };
     if (batchId) query.testBatchId = batchId;

     const regDel = await TournamentRegistration.deleteMany(query);
     const teamDel = await Team.deleteMany(query);
     const userDel = await User.deleteMany(query);

     res.json({
        success: true,
        message: 'Purge Complete',
        data: {
           destroyedRegistrations: regDel.deletedCount,
           destroyedTeams: teamDel.deletedCount,
           destroyedUsers: userDel.deletedCount
        }
     });
  } catch(err) {
     res.status(500).json({ success: false, message: 'Garbage Collection Failed' });
  }
};

// ── Full Test Account Generator ───────────────────────────────────────────────
// Creates 1 captain + 3 teammates + their team, all fully profiled
const GAMES = ['BGMI', 'Free Fire', 'PUBG', 'COD Mobile'];
const DEVICE_TYPES = ['mobile', 'tablet', 'mobile', 'mobile', 'mobile']; // weighted toward mobile
const DEVICE_NAMES = ['iPhone 14 Pro', 'Samsung Galaxy S23', 'OnePlus 11', 'Poco X5 Pro', 'Redmi Note 12', 'Realme GT Neo 5', 'iPad Air', 'Samsung Tab'];
const FIRST_NAMES = ['Arjun', 'Ravi', 'Karan', 'Vikram', 'Rohit', 'Aman', 'Sahil', 'Dev', 'Raj', 'Nikhil', 'Ankit', 'Priya', 'Sneha', 'Kavya', 'Meera'];
const LAST_NAMES = ['Sharma', 'Verma', 'Singh', 'Patel', 'Kumar', 'Gupta', 'Yadav', 'Chauhan', 'Tiwari', 'Joshi'];

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

const makeProfile = (str) => {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  return {
    realName: `${firstName} ${lastName}`,
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    ign: `${firstName.toLowerCase()}_${str}`,
    uid: `UID${Math.floor(1000000 + Math.random() * 9000000)}`,
    device: randomFrom(DEVICE_TYPES), // must be valid enum: 'mobile' | 'tablet' | 'emulator'
    deviceName: randomFrom(DEVICE_NAMES), // stored separately for display
  };
};

exports.generateFullTestAccount = async (req, res) => {
  try {
    const { teamSize = 4 } = req.body;
    const size = Math.min(Math.max(Number(teamSize) || 4, 2), 6);
    const batchId = generateBatchId();
    const hashedPassword = bcrypt.hashSync('password123', 12);

    // Create users
    const createdUsers = [];
    for (let i = 0; i < size; i++) {
      const str = crypto.randomBytes(3).toString('hex');
      const profile = makeProfile(str);
      const user = await User.create({
        username: `TestPlayer_${str}`,
        email: `test_${str}@sim.scrimx.com`,
        password: 'placeholder', // will be overridden below
        role: 'player',
        realName: profile.realName,
        phone: profile.phone,
        ign: profile.ign,
        uid: profile.uid,
        device: profile.device, // valid enum: 'mobile' | 'tablet' | 'emulator'
        wallet: { balance: Math.floor(500 + Math.random() * 4500) },
        isTestData: true,
        testBatchId: batchId,
        testType: 'player',
        isActive: true,
      });
      // Set password directly to avoid double-hash from pre('save')
      await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
      // Attach deviceName for display (not stored in DB)
      user._deviceName = profile.deviceName;
      user._profile = profile;
      createdUsers.push(user);
    }

    const captain = createdUsers[0];
    const teamHash = crypto.randomBytes(2).toString('hex').toUpperCase();

    const members = createdUsers.map((u, idx) => ({
      user: u._id,
      role: idx === 0 ? 'captain' : 'player',
      ign: u.ign,
      uid: u.uid,
    }));

    const team = await Team.create({
      name: `SIM SQUAD ${teamHash}`,
      tag: teamHash,
      captain: captain._id,
      members,
      isTestData: true,
      testBatchId: batchId,
    });

    res.status(201).json({
      success: true,
      message: `Full test account created! Team: ${team.name}`,
      data: {
        batchId,
        team: { name: team.name, tag: team.tag, id: team._id },
        captain: {
          username: captain.username,
          email: captain.email,
          password: 'password123',
          ign: captain.ign,
          uid: captain.uid,
          device: captain._deviceName || captain.device,
          realName: captain.realName,
          phone: captain.phone,
        },
        members: createdUsers.map(u => ({
          username: u.username,
          email: u.email,
          password: 'password123',
          ign: u.ign,
        })),
      }
    });
  } catch (err) {
    console.error('[generateFullTestAccount]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
