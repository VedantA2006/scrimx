const BoostRequest = require('../models/BoostRequest');
const Scrim = require('../models/Scrim');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

// @desc    Request Boost (organizer)
// @route   POST /api/boosts/request
const requestBoost = async (req, res, next) => {
  try {
    const { itemType, itemId, duration, utr, contactInfo } = req.body;

    if (!['scrim', 'tournament'].includes(itemType)) {
      throw new AppError('Invalid item type', 400);
    }
    if (!['1day', '3day', '7day'].includes(duration)) {
      throw new AppError('Invalid duration', 400);
    }
    if (!utr || !/^[A-Z0-9]{12}$/i.test(utr)) {
      throw new AppError('UTR is required and must be exactly 12 alphanumeric characters', 400);
    }

    // Verify Item exists and user is owner
    let item;
    if (itemType === 'scrim') item = await Scrim.findById(itemId);
    else item = await Tournament.findById(itemId);

    if (!item) throw new AppError('Item not found', 404);
    if (item.organizer.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to boost this item', 403);
    }
    
    // Check if item is already highlighted
    if (item.isHighlighted && new Date(item.highlightExpiresAt) > new Date()) {
      throw new AppError('This item is already highlighted', 400);
    }

    // Check if there's already a pending request
    const existing = await BoostRequest.findOne({
      itemId, status: 'pending'
    });
    if (existing) throw new AppError('You already have a pending boost request for this item', 400);

    // Calculate price
    let price = 99;
    if (duration === '3day') price = 249;
    else if (duration === '7day') price = 499;

    // Apply Pro/Elite logic if we want to visually map it here, but we'll stick to fixed price for now

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => {
        attachments.push({
          url: f.path,
          filename: f.originalname || 'file',
          mimetype: f.mimetype || ''
        });
      });
    }

    const boostRequest = await BoostRequest.create({
      organizer: req.user._id,
      itemType,
      itemId,
      duration,
      price,
      utr: utr.toUpperCase(),
      contactInfo: contactInfo || '',
      attachments
    });

    // Notify admin via Telegram
    try {
      const { bot, sendMessage } = require('../services/telegram.service');
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
      if (adminChatId) {
        const caption =
          `🚀 <b>Boost Request</b>\n` +
          `Organiser: ${req.user.username} (${req.user.email})\n` +
          `Item Type: ${itemType.toUpperCase()}\n` +
          `Item Name: ${item.title}\n` +
          `Duration: ${duration}\n` +
          `Price: ₹${price}\n` +
          `Contact: ${contactInfo || 'N/A'}\n` +
          `UTR: <code>${utr.toUpperCase()}</code>`;

        const inlineKeyboard = {
          inline_keyboard: [[
            { text: '✅ Approve Boost', callback_data: `boost_approve:${boostRequest._id}` },
            { text: '❌ Reject',  callback_data: `boost_reject:${boostRequest._id}` }
          ]]
        };

        const firstAttachment = attachments.length > 0 ? attachments[0].url : null;

        if (bot && firstAttachment) {
          await bot.sendPhoto(adminChatId, firstAttachment, {
            caption,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          });
        } else {
          await sendMessage(
            adminChatId,
            caption + (firstAttachment ? `\n\n📎 [Screenshot attached in dashboard]` : `\n\n📎 No screenshot attached.`),
            inlineKeyboard
          );
        }
      }
    } catch (tgErr) {
      console.error('Telegram notify failed:', tgErr.message);
    }

    sendResponse(res, 201, {
      message: 'Boost request submitted. Admin will review your request.',
      boostRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process boost request (admin approve/reject)
// @route   PATCH /api/boosts/admin/requests/:id
const processBoostRequest = async (req, res, next) => {
  try {
    const { status, adminReply, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);

    const boostReq = await BoostRequest.findById(req.params.id);
    if (!boostReq) throw new AppError('Request not found', 404);
    if (boostReq.status !== 'pending') throw new AppError('Request already processed', 400);

    boostReq.status = status;
    boostReq.processedBy = req.user._id;

    if (status === 'approved') {
      let durationDays = 1;
      if (boostReq.duration === '3day') durationDays = 3;
      else if (boostReq.duration === '7day') durationDays = 7;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      let boostScoreBase = 10;
      if (durationDays === 3) boostScoreBase = 30;
      else if (durationDays === 7) boostScoreBase = 70;

      if (boostReq.itemType === 'scrim') {
        await Scrim.findByIdAndUpdate(boostReq.itemId, {
          isHighlighted: true,
          highlightType: 'scrim',
          highlightPlan: boostReq.duration,
          highlightExpiresAt: expiresAt,
          boostScore: boostScoreBase
        });
      } else {
        await Tournament.findByIdAndUpdate(boostReq.itemId, {
          isHighlighted: true,
          highlightType: 'tournament',
          highlightPlan: boostReq.duration,
          highlightExpiresAt: expiresAt,
          boostScore: boostScoreBase
        });
      }
      
      boostReq.adminReply = adminReply || 'Boost approved and activated.';
    } else {
      boostReq.rejectionReason = rejectionReason || '';
      boostReq.adminReply = adminReply || '';
    }

    await boostReq.save();

    sendResponse(res, 200, {
      message: `Boost Request ${status}`,
      boostRequest: boostReq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all boost requests (admin)
// @route   GET /api/boosts/admin/requests
const getAdminBoostRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await BoostRequest.countDocuments(query);

    const requests = await BoostRequest.find(query)
      .populate('organizer', 'username email organizerProfile.displayName')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { requests }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured items for carousel
// @route   GET /api/boosts/featured
const getFeaturedItems = async (req, res, next) => {
  try {
    const now = new Date();
    
    // We aggregate scrims and tournaments that are highlighted and not expired
    const scrims = await Scrim.find({
      isHighlighted: true,
      highlightExpiresAt: { $gt: now }
    }).select('title mode format entryFee prizePool filledSlots slotCount banner status isHighlighted boostScore highlightExpiresAt organizer matches date').populate('organizer', 'username organizerProfile.displayName').lean();

    const tournaments = await Tournament.find({
      isHighlighted: true,
      highlightExpiresAt: { $gt: now }
    }).select('title mode format finance.entryFee finance.prizePool participation.maxTeams schedule status banner isHighlighted boostScore highlightExpiresAt organizer').populate('organizer', 'username organizerProfile.displayName').lean();

    // Map to unified format and calculate final score
    let items = [];
    
    scrims.forEach(s => {
      items.push({
        _id: s._id,
        type: 'scrim',
        title: s.title,
        mode: s.mode,
        format: s.format,
        map: s.matches?.[0]?.map || 'Erangel',
        entryFee: s.entryFee,
        prizePool: s.prizePool || 0,
        playersJoined: s.filledSlots * 4, // roughly 4 players per slot if squad
        totalSlots: s.slotCount * (s.format === 'squad' ? 4 : s.format === 'duo' ? 2 : 1),
        banner: s.banner,
        organizerName: s.organizer?.organizerProfile?.displayName || s.organizer?.username,
        highlightExpiresAt: s.highlightExpiresAt,
        startDate: s.date || null,
        finalScore: (s.boostScore || 0) + (s.filledSlots || 0)
      });
    });

    tournaments.forEach(t => {
      items.push({
        _id: t._id,
        type: 'tournament',
        title: t.title,
        mode: t.mode,
        format: t.format,
        map: 'Erangel', // General fallback for tournaments
        entryFee: t.finance?.entryFee || 0,
        prizePool: t.finance?.prizePool || 0,
        playersJoined: 0, // Placeholder unless we query registrations
        totalSlots: (t.participation?.maxTeams || 100) * (t.format === 'squad' ? 4 : t.format === 'duo' ? 2 : 1),
        banner: t.banner,
        organizerName: t.organizer?.organizerProfile?.displayName || t.organizer?.username,
        highlightExpiresAt: t.highlightExpiresAt,
        startDate: t.schedule?.matchStartDate || null,
        finalScore: (t.boostScore || 0) + 10 // Basic base engagement for tournament
      });
    });

    // Sort by finalScore desc
    items.sort((a, b) => b.finalScore - a.finalScore);

    // Take top 10
    items = items.slice(0, 10);

    sendResponse(res, 200, { items });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually remove highlight (Admin)
// @route   DELETE /api/boosts/admin/remove/:type/:id
const removeHighlight = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (type === 'scrim') {
      await Scrim.findByIdAndUpdate(id, {
        isHighlighted: false,
        $unset: { highlightType: 1, highlightPlan: 1, highlightExpiresAt: 1, boostScore: 1 }
      });
    } else if (type === 'tournament') {
      await Tournament.findByIdAndUpdate(id, {
        isHighlighted: false,
        $unset: { highlightType: 1, highlightPlan: 1, highlightExpiresAt: 1, boostScore: 1 }
      });
    } else {
      throw new AppError('Invalid type', 400);
    }

    sendResponse(res, 200, { message: 'Highlight removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestBoost,
  processBoostRequest,
  getAdminBoostRequests,
  getFeaturedItems,
  removeHighlight
};
