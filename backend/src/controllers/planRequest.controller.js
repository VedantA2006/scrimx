const PlanUpgradeRequest = require('../models/PlanUpgradeRequest');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

const getIO = (req) => req.app.get('io');

// @desc    Request plan upgrade (organizer)
// @route   POST /api/plans/request-upgrade
const requestUpgrade = async (req, res, next) => {
  try {
    const { message, contactInfo, utr } = req.body;
    
    // UTR validation
    if (!utr || !/^[A-Z0-9]{12}$/i.test(utr)) {
      throw new AppError('UTR is required and must be exactly 12 alphanumeric characters', 400);
    }
    
    // Check for duplicate UTR
    const duplicate = await PlanUpgradeRequest.findOne({ utr: utr.toUpperCase() });
    if (duplicate) throw new AppError('This UTR has already been submitted', 400);

    // Check if already has pending request
    const existing = await PlanUpgradeRequest.findOne({
      organizer: req.user._id,
      status: 'pending'
    });
    if (existing) throw new AppError('You already have a pending upgrade request', 400);

    // Check if already elite
    if (req.user.organizerProfile?.plan === 'elite' && req.user.organizerProfile?.subscription?.isActive) {
      const endDate = req.user.organizerProfile.subscription.endDate;
      if (endDate && new Date() < new Date(endDate)) {
        throw new AppError('You already have an active Elite plan', 400);
      }
    }

    // Find an admin user for conversation
    const admin = await User.findOne({ role: 'admin' }).select('_id');
    if (!admin) throw new AppError('No admin available. Please try again later.', 500);

    // Create conversation with admin
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, admin._id] },
      type: 'organizer_admin'
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, admin._id],
        type: 'organizer_admin',
        unreadCounts: new Map([[admin._id.toString(), 1]])
      });
    }

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

    const upgradeRequest = await PlanUpgradeRequest.create({
      organizer: req.user._id,
      requestedPlan: 'elite',
      message: message || '',
      contactInfo: contactInfo || '',
      utr: utr.toUpperCase(),
      attachments,
      conversation: conversation._id
    });

    // Notify admin via Telegram
    try {
      const { bot, sendMessage } = require('../services/telegram.service');
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
      if (adminChatId) {
        const caption =
          `🌟 <b>Elite Plan Upgrade Request</b>\n` +
          `Organiser: ${req.user.username} (${req.user.email})\n` +
          `Contact: ${contactInfo || 'N/A'}\n` +
          `UTR: <code>${utr.toUpperCase()}</code>\n` +
          (message ? `Message: ${message}` : '');

        const inlineKeyboard = {
          inline_keyboard: [[
            { text: '✅ Approve (30 days)', callback_data: `plan_approve:${upgradeRequest._id}` },
            { text: '❌ Reject',  callback_data: `plan_reject:${upgradeRequest._id}` }
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

    // System message
    const sysMsg = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type: 'system',
      content: `Plan upgrade request submitted for Elite plan`
    });

    // Send message content if provided
    if (message && message.trim()) {
      await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        type: 'text',
        content: message.trim()
      });
    }

    // Send attachments as messages
    for (const att of attachments) {
      await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        type: 'image',
        content: 'Payment proof',
        attachments: [att]
      });
    }

    conversation.lastMessage = {
      text: 'Plan upgrade request submitted',
      sender: req.user._id,
      createdAt: new Date()
    };
    conversation.joinRequest = undefined;
    await conversation.save();

    const io = getIO(req);
    if (io) {
      io.to(`user_${admin._id}`).emit('new_plan_request', {
        upgradeRequest,
        organizerName: req.user.organizerProfile?.displayName || req.user.username
      });
    }

    sendResponse(res, 201, {
      message: 'Upgrade request submitted. Admin will review your request.',
      upgradeRequest,
      conversationId: conversation._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my upgrade requests (organizer)
// @route   GET /api/plans/requests/my
const getMyUpgradeRequests = async (req, res, next) => {
  try {
    const requests = await PlanUpgradeRequest.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });

    sendResponse(res, 200, { requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all upgrade requests (admin)
// @route   GET /api/admin/plan-requests
const getAllUpgradeRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PlanUpgradeRequest.countDocuments(query);

    const requests = await PlanUpgradeRequest.find(query)
      .populate('organizer', 'username email organizerProfile.displayName organizerProfile.plan organizerProfile.subscription organizerProfile.isVerified avatar')
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

// @desc    Process upgrade request (admin approve/reject)
// @route   PATCH /api/admin/plan-requests/:id
const processUpgradeRequest = async (req, res, next) => {
  try {
    const { status, adminReply, rejectionReason, durationDays = 30 } = req.body;
    if (!['approved', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);

    const upgradeReq = await PlanUpgradeRequest.findById(req.params.id);
    if (!upgradeReq) throw new AppError('Request not found', 404);
    if (upgradeReq.status !== 'pending') throw new AppError('Request already processed', 400);

    upgradeReq.status = status;
    upgradeReq.processedBy = req.user._id;

    if (status === 'approved') {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (durationDays || 30));

      // Update organizer profile
      const organizer = await User.findById(upgradeReq.organizer);
      if (!organizer) throw new AppError('Organizer not found', 404);

      organizer.organizerProfile.plan = 'elite';
      organizer.organizerProfile.subscription = {
        startDate,
        endDate,
        isActive: true
      };
      await organizer.save();

      upgradeReq.activatedAt = startDate;
      upgradeReq.expiresAt = endDate;
      upgradeReq.adminReply = adminReply || 'Plan approved and activated.';
    } else {
      upgradeReq.rejectionReason = rejectionReason || '';
      upgradeReq.adminReply = adminReply || '';
    }

    await upgradeReq.save();

    // Send system message in conversation
    if (upgradeReq.conversation) {
      const statusText = status === 'approved'
        ? `✅ Elite plan approved and activated for ${durationDays || 30} days!`
        : `❌ Plan upgrade rejected${rejectionReason ? ': ' + rejectionReason : ''}`;

      const sysMsg = await Message.create({
        conversation: upgradeReq.conversation,
        sender: req.user._id,
        type: 'system',
        content: statusText
      });

      if (adminReply) {
        await Message.create({
          conversation: upgradeReq.conversation,
          sender: req.user._id,
          type: 'text',
          content: adminReply
        });
      }

      await Conversation.findByIdAndUpdate(upgradeReq.conversation, {
        lastMessage: { text: statusText, sender: req.user._id, createdAt: sysMsg.createdAt },
        $inc: { [`unreadCounts.${upgradeReq.organizer}`]: 1 }
      });

      const io = getIO(req);
      if (io) {
        io.to(`conv_${upgradeReq.conversation}`).emit('new_message', sysMsg);
        io.to(`user_${upgradeReq.organizer}`).emit('plan_request_updated', {
          status,
          requestId: upgradeReq._id
        });
      }
    }

    sendResponse(res, 200, {
      message: `Request ${status}`,
      upgradeRequest: upgradeReq
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestUpgrade,
  getMyUpgradeRequests,
  getAllUpgradeRequests,
  processUpgradeRequest
};
