const User = require('../models/User');
const OrganizerPointRequest = require('../models/OrganizerPointRequest');
const OrganizerPointTransaction = require('../models/OrganizerPointTransaction');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Get organizer point balance & summary
// @route   GET /api/points/wallet
const getOrganizerWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'organizer') throw new AppError('Organizer not found', 404);

    const { getOrganizerTierInfo } = require('../utils/organizerTier');
    const tierInfo = getOrganizerTierInfo(user);

    const wallet = user.organizerProfile?.pointsWallet || { balance: 0, totalAdded: 0, totalUsed: 0 };
    
    // Get recent transactions
    const transactions = await OrganizerPointTransaction.find({ organizer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('relatedScrim', 'title')
      .populate('createdByAdmin', 'username');

    // Get all requests (last 20) so organiser can see approved/rejected status too
    const pendingRequests = await OrganizerPointRequest.find({
      organizer: req.user._id
    }).sort({ createdAt: -1 }).limit(20);

    sendResponse(res, 200, {
      tierInfo,
      totalScrimsHosted: user.organizerProfile?.totalScrimsHosted || 0,
      totalPlayersHosted: user.organizerProfile?.totalPlayersHosted || 0,
      wallet,
      transactions,
      pendingRequests,
      scrimCost: tierInfo.scrimCost // dynamic cost
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request points from admin
// @route   POST /api/points/request
const submitPointRequest = async (req, res, next) => {
  try {
    const { requestedPoints, utr, message } = req.body;
    let attachment = '';

    if (req.file) {
      attachment = req.file.path;
    }

    if (!requestedPoints || requestedPoints < 1) {
      throw new AppError('Valid requested amount is required', 400);
    }

    // UTR validation — required, exactly 12 alphanumeric
    if (!utr || !/^[A-Z0-9]{12}$/i.test(utr)) {
      throw new AppError('UTR is required and must be exactly 12 alphanumeric characters', 400);
    }

    // Prevent duplicate UTR submissions
    const duplicate = await OrganizerPointRequest.findOne({ utr: utr.toUpperCase() });
    if (duplicate) throw new AppError('This UTR has already been submitted', 400);

    const organizer = await User.findById(req.user._id);

    const request = await OrganizerPointRequest.create({
      organizer: req.user._id,
      requestedPoints: Number(requestedPoints),
      utr: utr.toUpperCase(),
      message: message || '',
      attachment
    });

    // Notify admin via Telegram (send photo with caption if screenshot uploaded, else text)
    try {
      const { bot, sendMessage } = require('../services/telegram.service');
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
      if (adminChatId) {
        const caption =
          `💰 <b>Point Top-up Request</b>\n` +
          `Organiser: ${organizer.username} (${organizer.email})\n` +
          `Points: ${requestedPoints} pts (₹${requestedPoints})\n` +
          `UTR: <code>${utr.toUpperCase()}</code>`;

        const inlineKeyboard = {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: `pointreq_approve:${request._id}` },
            { text: '❌ Reject',  callback_data: `pointreq_reject:${request._id}` }
          ]]
        };

        if (bot && attachment) {
          await bot.sendPhoto(adminChatId, attachment, {
            caption,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          });
        } else {
          await sendMessage(
            adminChatId,
            caption + (attachment ? `\n\n📎 [Screenshot attached in dashboard]` : `\n\n📎 No screenshot attached.`),
            inlineKeyboard
          );
        }
      }
    } catch (tgErr) {
      console.error('Telegram notify failed:', tgErr.message);
    }

    sendResponse(res, 201, { message: 'Point request submitted successfully', request });
  } catch (err) {
    next(err);
  }
};


// @desc    Get all point requests (Admin only)
// @route   GET /api/points/admin/requests
const getAdminPointRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await OrganizerPointRequest.find(filter)
      .populate('organizer', 'username organizerProfile.displayName organizerProfile.logo')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, { requests });
  } catch (err) {
    next(err);
  }
};

// @desc    Review point request (Admin only)
// @route   PATCH /api/points/admin/requests/:id
const reviewPointRequest = async (req, res, next) => {
  try {
    const { status, adminResponse } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError('Invalid status. Use approved or rejected', 400);
    }

    const request = await OrganizerPointRequest.findById(req.params.id);
    if (!request) throw new AppError('Request not found', 404);
    if (request.status !== 'pending') throw new AppError(`Request already ${request.status}`, 400);

    request.status = status;
    request.adminResponse = adminResponse || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    if (status === 'approved') {
      const user = await User.findById(request.organizer);
      if (!user) throw new AppError('Organizer no longer exists', 404);

      // Current balance
      const currentBalance = user.organizerProfile?.pointsWallet?.balance || 0;
      const pointsToAdd = request.requestedPoints;

      // Update user Points
      await User.updateOne(
        { _id: user._id },
        { 
          $inc: { 
            'organizerProfile.pointsWallet.balance': pointsToAdd,
            'organizerProfile.pointsWallet.totalAdded': pointsToAdd
          },
          $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
        }
      );

      // Record transaction
      await OrganizerPointTransaction.create({
        organizer: user._id,
        type: 'credit',
        points: pointsToAdd,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + pointsToAdd,
        reason: 'Point Request Approved',
        relatedRequest: request._id,
        createdByAdmin: req.user._id
      });
    }

    await request.save();
    sendResponse(res, 200, { message: `Request ${status}`, request });
  } catch (err) {
    next(err);
  }
};

// @desc    Directly add/deduct points to an organizer (Admin only)
// @route   POST /api/points/admin/organizers/:id/adjustment
const directPointAdjustment = async (req, res, next) => {
  try {
    const { type, points, reason } = req.body; // type: credit or debit
    const pointAmount = Number(points);

    if (!['credit', 'debit'].includes(type) || !pointAmount || pointAmount <= 0) {
      throw new AppError('Valid type (credit/debit) and positive points amount required', 400);
    }
    if (!reason) {
      throw new AppError('Adjustment reason is required', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'organizer') throw new AppError('Valid organizer not found', 404);

    const currentBalance = user.organizerProfile?.pointsWallet?.balance || 0;

    if (type === 'debit' && currentBalance < pointAmount) {
      throw new AppError('Organizer does not have enough points for this deduction', 400);
    }

    const updateQuery = {
      $inc: {
        'organizerProfile.pointsWallet.balance': type === 'credit' ? pointAmount : -pointAmount,
      },
      $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
    };

    if (type === 'credit') {
      updateQuery.$inc['organizerProfile.pointsWallet.totalAdded'] = pointAmount;
    } else {
      updateQuery.$inc['organizerProfile.pointsWallet.totalUsed'] = pointAmount;
    }

    await User.updateOne({ _id: user._id }, updateQuery);

    const tx = await OrganizerPointTransaction.create({
      organizer: user._id,
      type: type === 'credit' ? 'adjustment' : 'debit',
      points: pointAmount, // Using positive for amount in model, type implies flow
      balanceBefore: currentBalance,
      balanceAfter: type === 'credit' ? currentBalance + pointAmount : currentBalance - pointAmount,
      reason: `Admin Adjustment: ${reason}`,
      createdByAdmin: req.user._id
    });

    sendResponse(res, 200, { message: `Points adjusted successfully`, transaction: tx });
  } catch (err) {
    next(err);
  }
};

// @desc    Get organizer point history (Admin only)
// @route   GET /api/points/admin/organizers/:id/ledger
const getAdminOrganizerLedger = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Organizer not found', 404);

    const transactions = await OrganizerPointTransaction.find({ organizer: user._id })
      .sort({ createdAt: -1 })
      .populate('relatedScrim', 'title status')
      .populate('createdByAdmin', 'username');

    const wallet = user.organizerProfile?.pointsWallet || { balance: 0, totalAdded: 0, totalUsed: 0 };

    sendResponse(res, 200, {
      organizer: {
        _id: user._id,
        username: user.username,
        displayName: user.organizerProfile?.displayName,
      },
      wallet,
      transactions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my tier info
// @route   GET /api/points/tier
const getMyTierInfo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'organizer') throw new AppError('Organizer not found', 404);

    const { getOrganizerTierInfo } = require('../utils/organizerTier');
    const tierInfo = getOrganizerTierInfo(user);
    const wallet = user.organizerProfile?.pointsWallet || { balance: 0, totalAdded: 0, totalUsed: 0 };

    sendResponse(res, 200, {
      tierInfo,
      wallet,
      totalScrimsHosted: user.organizerProfile?.totalScrimsHosted || 0,
      totalPlayersHosted: user.organizerProfile?.totalPlayersHosted || 0
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrganizerWallet,
  submitPointRequest,
  getAdminPointRequests,
  reviewPointRequest,
  directPointAdjustment,
  getAdminOrganizerLedger,
  getMyTierInfo
};
