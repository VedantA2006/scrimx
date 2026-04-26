const Scrim = require('../models/Scrim');
const User = require('../models/User');
const OrganizerPointTransaction = require('../models/OrganizerPointTransaction');
const { getOrganizerTierInfo } = require('../utils/organizerTier');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

// @desc    Create scrim
// @route   POST /api/scrims
const createScrim = async (req, res, next) => {
  try {
    const data = req.body;
    data.organizer = req.user._id;

    // Handle banner file upload from Cloudinary
    if (req.file) {
      data.banner = req.file.path;
    }

    // Parse JSON fields if sent via FormData (multipart sends strings)
    if (typeof data.matches === 'string') {
      try { data.matches = JSON.parse(data.matches); } catch (e) {}
    }
    if (typeof data.prizeDistribution === 'string') {
      try { data.prizeDistribution = JSON.parse(data.prizeDistribution); } catch (e) {}
    }
    if (typeof data.slotCount === 'string') data.slotCount = Number(data.slotCount);
    if (typeof data.entryFee === 'string') data.entryFee = Number(data.entryFee);
    
    if ((data.entryFee || 0) > 0) {
      const org = await User.findById(req.user._id).select('organizerProfile.upiId');
      if (!org?.organizerProfile?.upiId) {
        throw new AppError(
          'You must set a UPI ID in your profile before creating a paid scrim.',
          400
        );
      }
    }

    if (typeof data.organizerCut === 'string') data.organizerCut = Number(data.organizerCut);
    if (typeof data.numberOfMatches === 'string') data.numberOfMatches = Number(data.numberOfMatches);
    if (typeof data.inviteLinkExpiryMinutes === 'string') data.inviteLinkExpiryMinutes = Number(data.inviteLinkExpiryMinutes);
    // registrationMethod and registrationNote come as strings from FormData already
    // Check if organizer is elite
    if (req.user.organizerProfile?.plan === 'elite') {
      data.isElite = true;
    }

    // Calculate economics automatically
    const totalPool = (data.slotCount || 0) * (data.entryFee || 0);
    const platformFeePercentage = 7;
    const organizerCutPercentage = data.organizerCut || 0;
    const platformCutAmount = totalPool * (platformFeePercentage / 100);
    const organizerCutAmount = totalPool * (organizerCutPercentage / 100);
    data.prizePool = totalPool - platformCutAmount - organizerCutAmount;
    data.platformFee = platformFeePercentage;

    // Validate prize distribution (percentage-based)
    if (data.prizeDistribution && data.prizeDistribution.length > 0) {
      const totalPercentage = data.prizeDistribution.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (totalPercentage > 100) {
        throw new AppError('Prize distribution percentages cannot exceed 100%', 400);
      }
      // Calculate estimated amounts based on max prize pool for display
      data.prizeDistribution = data.prizeDistribution.map(p => ({
        ...p,
        amount: Math.round(data.prizePool * (p.percentage / 100))
      }));
    }

    const scrim = await Scrim.create(data);
    sendResponse(res, 201, { message: 'Scrim created', scrim });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public scrims (marketplace)
// @route   GET /api/scrims
const getScrims = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 12, sort = '-date',
      search, mode, format, minPrize, maxPrize, minFee, maxFee,
      status, featured, skillTier, organizer, date
    } = req.query;

    const query = { visibility: 'public' };

    // Status filter — default: show everything except cancelled
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'cancelled' };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { subtitle: { $regex: escaped, $options: 'i' } }
      ];
    }
    if (mode) query.mode = mode;
    if (format) query.format = format;
    if (skillTier) query.skillTier = skillTier;
    if (featured === 'true') query.isFeatured = true;
    
    if (req.query.isElite === 'true') {
      const eliteUsers = await User.find({ 'organizerProfile.plan': 'elite' }).select('_id');
      const eliteUserIds = eliteUsers.map(u => u._id);
      
      const isEliteCondition = { $or: [{ isElite: true }, { organizer: { $in: eliteUserIds } }] };
      
      if (query.$or) {
        query.$and = [ { $or: query.$or }, isEliteCondition ];
        delete query.$or;
      } else {
        query.$or = isEliteCondition.$or;
      }
    }
    
    if (organizer) query.organizer = organizer;

    if (minPrize || maxPrize) {
      query.prizePool = {};
      if (minPrize) query.prizePool.$gte = parseInt(minPrize);
      if (maxPrize) query.prizePool.$lte = parseInt(maxPrize);
    }

    if (minFee || maxFee) {
      query.entryFee = {};
      if (minFee) query.entryFee.$gte = parseInt(minFee);
      if (maxFee) query.entryFee.$lte = parseInt(maxFee);
    }

    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }
    

    // Sorting - Boost Elite by default
    let sortOption = {};
    switch (sort) {
      case 'prize_desc': sortOption = { prizePool: -1 }; break;
      case 'prize_asc': sortOption = { prizePool: 1 }; break;
      case 'fee_asc': sortOption = { entryFee: 1 }; break;
      case 'fee_desc': sortOption = { entryFee: -1 }; break;
      case 'date_asc': sortOption = { isElite: -1, date: 1 }; break;
      case 'newest': sortOption = { isElite: -1, createdAt: -1 }; break;
      default: sortOption = { isElite: -1, date: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Scrim.countDocuments(query);
    const scrims = await Scrim.find(query)
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified organizerProfile.slug organizerProfile.plan')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { scrims }, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured scrims for homepage
// @route   GET /api/scrims/featured
const getFeaturedScrims = async (req, res, next) => {
  try {
    const now = new Date();
    const isNotExpiredExpr = {
      $gt: [
        {
          $add: [
            "$date",
            { $multiply: [ { $toInt: { $arrayElemAt: [{ $split: [{ $ifNull: ["$startTime", "00:00"] }, ":"] }, 0] } }, 3600000 ] },
            { $multiply: [ { $toInt: { $arrayElemAt: [{ $split: [{ $ifNull: ["$startTime", "00:00"] }, ":"] }, 1] } }, 60000 ] },
            { $multiply: [ { $ifNull: ["$numberOfMatches", 1] }, 2700000 ] }
          ]
        },
        now
      ]
    };

    const commonFilter = {
      visibility: 'public',
      status: { $in: ['published', 'registrations_open'] },
      $expr: isNotExpiredExpr
    };

    const featured = await Scrim.find({
      ...commonFilter,
      isFeatured: true
    })
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified')
      .sort({ date: 1 })
      .limit(6);

    const trending = await Scrim.find({
      ...commonFilter,
      prizePool: { $gt: 0 }
    })
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified')
      .sort({ registrationCount: -1, viewCount: -1 })
      .limit(6);

    const upcoming = await Scrim.find(commonFilter)
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified')
      .sort({ date: 1 })
      .limit(6);

    const recent = await Scrim.find(commonFilter)
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified')
      .sort({ createdAt: -1 })
      .limit(6);

    sendResponse(res, 200, { featured, trending, upcoming, recent });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single scrim
// @route   GET /api/scrims/:id
const getScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id)
      .populate('organizer', 'username organizerProfile avatar');

    if (!scrim) throw new AppError('Scrim not found', 404);

    // Increment view count without triggering full document validation
    await Scrim.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    const scrimObj = scrim.toObject();

    // Redact IDP from public view
    if (scrimObj.matches) {
      scrimObj.matches.forEach(m => {
        delete m.roomId;
        delete m.roomPassword;
      });
    }

    sendResponse(res, 200, { scrim: scrimObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update scrim
// @route   PUT /api/scrims/:id
const updateScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);

    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const data = req.body;

    // Handle banner file upload from Cloudinary
    if (req.file) {
      data.banner = req.file.path;
    }

    // Parse JSON fields if sent via FormData
    if (typeof data.matches === 'string') {
      try { data.matches = JSON.parse(data.matches); } catch (e) {}
    }
    if (typeof data.prizeDistribution === 'string') {
      try { data.prizeDistribution = JSON.parse(data.prizeDistribution); } catch (e) {}
    }
    if (typeof data.slotCount === 'string') data.slotCount = Number(data.slotCount);
    if (typeof data.entryFee === 'string') data.entryFee = Number(data.entryFee);
    if (typeof data.organizerCut === 'string') data.organizerCut = Number(data.organizerCut);
    if (typeof data.numberOfMatches === 'string') data.numberOfMatches = Number(data.numberOfMatches);

    // Calculate economics automatically if core values changed
    const slotCount = data.slotCount !== undefined ? data.slotCount : scrim.slotCount;
    const entryFee = data.entryFee !== undefined ? data.entryFee : scrim.entryFee;
    const organizerCut = data.organizerCut !== undefined ? data.organizerCut : scrim.organizerCut;
    
    const totalPool = slotCount * entryFee;
    const platformFeePercentage = scrim.platformFee || 7;
    const platformCutAmount = totalPool * (platformFeePercentage / 100);
    const organizerCutAmount = totalPool * (organizerCut / 100);
    const newPrizePool = totalPool - platformCutAmount - organizerCutAmount;
    
    data.prizePool = newPrizePool;

    // Validate prize distribution (percentage-based)
    if (data.prizeDistribution) {
      const totalPercentage = data.prizeDistribution.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (totalPercentage > 100) {
        throw new AppError('Prize distribution percentages cannot exceed 100%', 400);
      }
      // Calculate estimated amounts based on max prize pool for display
      data.prizeDistribution = data.prizeDistribution.map(p => ({
        ...p,
        amount: Math.round(newPrizePool * (p.percentage / 100))
      }));
    }

    Object.assign(scrim, data);
    await scrim.save();

    sendResponse(res, 200, { message: 'Scrim updated', scrim });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish scrim
// @route   PUT /api/scrims/:id/publish
const publishScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);

    if (scrim.organizer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (scrim.status !== 'draft') {
      throw new AppError('Scrim can only be published from draft status', 400);
    }

    const HOSTING_COST = 30;

    // Super Organizer bypass — free publish
    const tierInfo = getOrganizerTierInfo(req.user);
    if (tierInfo.creditLimitOverride) {
      scrim.status = 'registrations_open';
      await scrim.save();
      return sendResponse(res, 200, { message: 'Scrim published (Super Organizer — no cost)', scrim });
    }

    // Load organizer safely
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    const currentBalance = user.organizerProfile?.pointsWallet?.balance || 0;

    if (currentBalance < HOSTING_COST) {
      throw new AppError('Payment Required: You need at least 30 points to host a scrim', 402);
    }

    // Attempt conditional decrement logic
    const updateResult = await User.updateOne(
      { 
        _id: user._id, 
        'organizerProfile.pointsWallet.balance': { $gte: HOSTING_COST } 
      },
      {
        $inc: { 
          'organizerProfile.pointsWallet.balance': -HOSTING_COST,
          'organizerProfile.pointsWallet.totalUsed': HOSTING_COST
        },
        $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
      }
    );

    if (updateResult.modifiedCount !== 1) {
      throw new AppError('Payment Required: Insufficient points or concurrency block', 402);
    }

    // Mark as open
    scrim.status = 'registrations_open';
    await scrim.save();

    // Ledger transaction creation
    await OrganizerPointTransaction.create({
      organizer: user._id,
      type: 'debit',
      points: HOSTING_COST,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - HOSTING_COST,
      reason: 'Host Scrim Publishing Fee',
      relatedScrim: scrim._id
    });

    sendResponse(res, 200, { message: 'Scrim published and points deducted', scrim });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel scrim
// @route   PUT /api/scrims/:id/cancel
const cancelScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);

    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    if (['completed', 'cancelled'].includes(scrim.status)) {
      throw new AppError('Cannot cancel a completed or already cancelled scrim', 400);
    }

    scrim.status = 'cancelled';
    await scrim.save();

    // TODO: Refund registrations in Phase 7

    sendResponse(res, 200, { message: 'Scrim cancelled', scrim });
  } catch (error) {
    next(error);
  }
};

// @desc    Release IDP for a Match
// @route   PUT /api/scrims/:id/matches/:matchIndex/idp
const releaseMatchIdp = async (req, res, next) => {
  try {
    const { roomId, roomPassword } = req.body;
    const matchIndex = parseInt(req.params.matchIndex);
    const scrim = await Scrim.findById(req.params.id);
    
    if (!scrim) throw new AppError('Scrim not found', 404);
    
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }
    
    if (!scrim.matches || !scrim.matches[matchIndex]) {
      throw new AppError('Match not found', 404);
    }

    scrim.matches[matchIndex].roomId = roomId;
    scrim.matches[matchIndex].roomPassword = roomPassword;
    scrim.matches[matchIndex].isIdpReleased = true;
    
    await scrim.save();

    const io = req.app.get('io');
    if (io) {
      const Registration = require('../models/Registration');
      const approvedRegs = await Registration.find({
        scrim: scrim._id, status: 'approved'
      }).select('registeredBy');
      approvedRegs.forEach(reg => {
        io.to(`user_${reg.registeredBy}`).emit('idp_released', {
          scrimId: scrim._id,
          scrimTitle: scrim.title,
          matchIndex,
          roomId,
          roomPassword
        });
      });
    }

    sendResponse(res, 200, { message: 'IDP released successfully', match: scrim.matches[matchIndex] });
  } catch (error) {
    next(error);
  }
};

// @desc    Get IDP for Scrim (Authorized users only)
// @route   GET /api/scrims/:id/idp
const getScrimIdps = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);

    const isOrganizer = scrim.organizer.toString() === req.user._id.toString();
    
    const Registration = require('../models/Registration');
    const Team = require('../models/Team');

    // Check if user is a member of any team registered for this scrim
    const userTeams = await Team.find({ 'members.user': req.user._id, isActive: true }).select('_id');
    const userTeamIds = userTeams.map(t => t._id);
    const isRegistered = await Registration.exists({ 
      scrim: scrim._id, 
      team: { $in: userTeamIds }, 
      status: 'approved' 
    });

    if (!isOrganizer && !isRegistered && req.user.role !== 'admin') {
      throw new AppError('Not authorized to view IDP. You must be an approved participant.', 403);
    }

    const idps = scrim.matches.map(m => ({
      matchNumber: m.matchNumber,
      isIdpReleased: m.isIdpReleased,
      roomId: m.isIdpReleased ? m.roomId : null,
      roomPassword: m.isIdpReleased ? m.roomPassword : null
    }));

    sendResponse(res, 200, { idps });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organizer's scrims
// @route   GET /api/scrims/my
const getMyScrims = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { organizer: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Scrim.countDocuments(query);
    const scrims = await Scrim.find(query)
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo organizerProfile.isVerified organizerProfile.plan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { scrims }, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete scrim (admin or organizer)
// @route   DELETE /api/scrims/:id
const deleteScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);

    const isOwner = scrim.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized', 403);
    }

    const Registration = require('../models/Registration');
    const activeRegs = await Registration.countDocuments({
      scrim: scrim._id,
      status: { $in: ['pending','approved','waitlisted'] }
    });
    if (activeRegs > 0 && req.user.role !== 'admin') {
      throw new AppError(
        `Cannot delete a scrim with ${activeRegs} active registration(s). Cancel it first.`,
        400
      );
    }

    await scrim.deleteOne();
    sendResponse(res, 200, { message: 'Scrim deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Highlight scrim (trending)
// @route   PUT /api/scrims/:id/highlight
const highlightScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const tierInfo = getOrganizerTierInfo(req.user);
    if (!tierInfo.canHighlight) throw new AppError('Your tier does not support highlighting', 403);

    const cost = tierInfo.creditLimitOverride ? 0 : 10;

    if (cost > 0) {
      const user = await User.findById(req.user._id);
      const balance = user.organizerProfile?.pointsWallet?.balance || 0;
      if (balance < cost) throw new AppError('Insufficient credits for highlighting', 402);

      await User.updateOne(
        { _id: user._id, 'organizerProfile.pointsWallet.balance': { $gte: cost } },
        {
          $inc: { 'organizerProfile.pointsWallet.balance': -cost, 'organizerProfile.pointsWallet.totalUsed': cost },
          $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
        }
      );

      await OrganizerPointTransaction.create({
        organizer: user._id, type: 'debit', points: cost,
        balanceBefore: balance, balanceAfter: balance - cost,
        reason: `Highlight scrim: ${scrim.title}`, relatedScrim: scrim._id
      });
    }

    scrim.isTrending = true;
    await scrim.save();
    sendResponse(res, 200, { message: 'Scrim highlighted successfully', scrim });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote scrim (featured)
// @route   PUT /api/scrims/:id/promote
const promoteScrim = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.id);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const tierInfo = getOrganizerTierInfo(req.user);
    if (!tierInfo.canPromote) throw new AppError('Your tier does not support promotion', 403);

    const cost = tierInfo.creditLimitOverride ? 0 : 20;

    if (cost > 0) {
      const user = await User.findById(req.user._id);
      const balance = user.organizerProfile?.pointsWallet?.balance || 0;
      if (balance < cost) throw new AppError('Insufficient credits for promotion', 402);

      await User.updateOne(
        { _id: user._id, 'organizerProfile.pointsWallet.balance': { $gte: cost } },
        {
          $inc: { 'organizerProfile.pointsWallet.balance': -cost, 'organizerProfile.pointsWallet.totalUsed': cost },
          $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
        }
      );

      await OrganizerPointTransaction.create({
        organizer: user._id, type: 'debit', points: cost,
        balanceBefore: balance, balanceAfter: balance - cost,
        reason: `Promote scrim: ${scrim.title}`, relatedScrim: scrim._id
      });
    }

    scrim.isFeatured = true;
    await scrim.save();
    sendResponse(res, 200, { message: 'Scrim promoted successfully', scrim });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createScrim, getScrims, getFeaturedScrims, getScrim,
  updateScrim, publishScrim, cancelScrim, releaseMatchIdp, getScrimIdps, getMyScrims, deleteScrim,
  highlightScrim, promoteScrim
};
