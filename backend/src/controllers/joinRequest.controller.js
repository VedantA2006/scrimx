const crypto = require('crypto');
const mongoose = require('mongoose');
const ScrimJoinRequest = require('../models/ScrimJoinRequest');
const Scrim = require('../models/Scrim');
const Team = require('../models/Team');
const Registration = require('../models/Registration');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// Helper: get io instance
const getIO = (req) => req.app.get('io');

// @desc    Create a slot request
// @route   POST /api/join-requests
const createJoinRequest = async (req, res, next) => {
  try {
    const { scrimId, teamId, note } = req.body;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (!['registrations_open'].includes(scrim.status)) throw new AppError('Registrations are not open', 400);
    if (scrim.filledSlots >= scrim.slotCount) throw new AppError('All slots are filled', 400);

    const team = await Team.findById(teamId);
    if (!team) throw new AppError('Team not found', 404);
    
    const isMember = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!isMember) throw new AppError('You are not a member of this team', 400);

    // Check duplicate active request
    const existing = await ScrimJoinRequest.findOne({
      scrim: scrimId,
      team: teamId,
      status: { $in: ['pending', 'chat_open', 'approved'] }
    });
    if (existing) throw new AppError('You already have an active request for this scrim', 400);

    // Check if already registered
    const existingReg = await Registration.findOne({ scrim: scrimId, team: teamId, status: { $nin: ['cancelled', 'refunded'] } });
    if (existingReg) throw new AppError('Team is already registered for this scrim', 400);

    // Create conversation between requester and organizer
    let conversation = await Conversation.findOne({
      scrim: scrimId,
      participants: { $all: [req.user._id, scrim.organizer] },
      type: 'scrim_inquiry'
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, scrim.organizer],
        type: 'scrim_inquiry',
        scrim: scrimId,
        unreadCounts: new Map([[scrim.organizer.toString(), 1]])
      });
    }

    // Create join request
    const joinRequest = await ScrimJoinRequest.create({
      scrim: scrimId,
      requestedBy: req.user._id,
      team: teamId,
      organizer: scrim.organizer,
      conversation: conversation._id,
      note: note || '',
      status: 'pending'
    });

    // Link join request to conversation
    conversation.joinRequest = joinRequest._id;

    // Create system message
    const systemMsg = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type: 'system',
      content: `Slot request created for "${scrim.title}" by team ${team.name}`
    });

    // If user included a note, send it as text message
    if (note && note.trim()) {
      const noteMsg = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        type: 'text',
        content: note.trim()
      });
      conversation.lastMessage = {
        text: note.trim(),
        sender: req.user._id,
        createdAt: noteMsg.createdAt
      };
    } else {
      conversation.lastMessage = {
        text: `Slot request created`,
        sender: req.user._id,
        createdAt: systemMsg.createdAt
      };
    }

    await conversation.save();

    // Emit socket event
    const io = getIO(req);
    if (io) {
      io.to(`conv_${conversation._id}`).emit('new_message', systemMsg);
      io.to(`user_${scrim.organizer}`).emit('new_join_request', {
        joinRequest,
        scrimTitle: scrim.title,
        teamName: team.name
      });
    }

    sendResponse(res, 201, {
      message: 'Slot request submitted',
      joinRequest,
      conversationId: conversation._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my join requests (player)
// @route   GET /api/join-requests/my
const getMyJoinRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { requestedBy: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const requests = await ScrimJoinRequest.find(query)
      .populate('scrim', 'title date startTime status banner filledSlots slotCount entryFee format mode')
      .populate('team', 'name tag logo')
      .populate('organizer', 'username organizerProfile.displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ScrimJoinRequest.countDocuments(query);

    sendResponse(res, 200, {
      requests,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get join requests for a scrim (organizer)
// @route   GET /api/join-requests/scrim/:scrimId
const getScrimJoinRequests = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const { status, page = 1, limit = 20 } = req.query;
    const query = { scrim: req.params.scrimId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const requests = await ScrimJoinRequest.find(query)
      .populate('requestedBy', 'username ign avatar')
      .populate('team', 'name tag logo members')
      .populate('conversation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ScrimJoinRequest.countDocuments(query);

    sendResponse(res, 200, {
      requests,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update join request status (organizer)
// @route   PATCH /api/join-requests/:id/status
const updateJoinRequestStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['chat_open', 'approved', 'rejected', 'expired'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const joinReq = await ScrimJoinRequest.findById(req.params.id)
      .populate('scrim', 'title organizer');
    if (!joinReq) throw new AppError('Request not found', 404);

    if (joinReq.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    joinReq.status = status;
    if (rejectionReason) joinReq.rejectionReason = rejectionReason;
    await joinReq.save();

    // Send system message
    if (joinReq.conversation) {
      const statusText = status === 'rejected' 
        ? `Request rejected${rejectionReason ? ': ' + rejectionReason : ''}`
        : `Request status updated to: ${status.replace('_', ' ')}`;
      
      const sysMsg = await Message.create({
        conversation: joinReq.conversation,
        sender: req.user._id,
        type: 'system',
        content: statusText
      });

      await Conversation.findByIdAndUpdate(joinReq.conversation, {
        lastMessage: { text: statusText, sender: req.user._id, createdAt: sysMsg.createdAt }
      });

      const io = getIO(req);
      if (io) {
        io.to(`conv_${joinReq.conversation}`).emit('new_message', sysMsg);
      }
    }

    sendResponse(res, 200, { message: `Request ${status}`, joinRequest: joinReq });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate private invite link
// @route   POST /api/join-requests/:id/generate-invite
const generateInviteLink = async (req, res, next) => {
  try {
    const joinReq = await ScrimJoinRequest.findById(req.params.id);
    if (!joinReq) throw new AppError('Request not found', 404);

    if (joinReq.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    if (joinReq.status === 'converted') {
      throw new AppError('This request has already been converted to a registration', 400);
    }
    if (joinReq.status === 'rejected') {
      throw new AppError('Cannot generate invite for a rejected request', 400);
    }

    const scrim = await Scrim.findById(joinReq.scrim);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.filledSlots >= scrim.slotCount) throw new AppError('Scrim is already full', 400);

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiryMinutes = scrim.inviteLinkExpiryMinutes || 1440;

    joinReq.privateInviteToken = rawToken;
    joinReq.privateInviteExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    joinReq.privateInviteUsedAt = null;
    joinReq.status = 'approved';
    await joinReq.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteUrl = `${clientUrl}/join/${rawToken}`;

    // Send invite link message in conversation
    if (joinReq.conversation) {
      const inviteMsg = await Message.create({
        conversation: joinReq.conversation,
        sender: req.user._id,
        type: 'invite_link',
        content: `Private join link generated! Click to confirm your slot.`,
        metadata: { inviteUrl, expiresAt: joinReq.privateInviteExpiresAt }
      });

      const unreadUpdate = {};
      unreadUpdate[`unreadCounts.${joinReq.requestedBy}`] = 1;
      
      await Conversation.findByIdAndUpdate(joinReq.conversation, {
        lastMessage: { text: '🔗 Private join link sent', sender: req.user._id, createdAt: inviteMsg.createdAt },
        $inc: unreadUpdate
      });

      const io = getIO(req);
      if (io) {
        io.to(`conv_${joinReq.conversation}`).emit('new_message', inviteMsg);
        io.to(`user_${joinReq.requestedBy}`).emit('invite_link_received', {
          joinRequestId: joinReq._id,
          inviteUrl
        });
      }
    }

    sendResponse(res, 200, {
      message: 'Invite link generated and sent in chat',
      inviteUrl,
      expiresAt: joinReq.privateInviteExpiresAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate invite token
// @route   GET /api/join-requests/invite/:token/validate
const validateInviteToken = async (req, res, next) => {
  try {
    const joinReq = await ScrimJoinRequest.findOne({ privateInviteToken: req.params.token })
      .populate('scrim', 'title date startTime status filledSlots slotCount format mode banner')
      .populate('team', 'name tag logo')
      .populate('organizer', 'username organizerProfile.displayName');

    if (!joinReq) throw new AppError('Invalid or expired invite link', 404);

    if (joinReq.privateInviteUsedAt) {
      return sendResponse(res, 400, { valid: false, reason: 'used', message: 'This invite link has already been used' });
    }

    if (joinReq.privateInviteExpiresAt && new Date() > joinReq.privateInviteExpiresAt) {
      return sendResponse(res, 400, { valid: false, reason: 'expired', message: 'This invite link has expired' });
    }

    if (joinReq.status === 'converted') {
      return sendResponse(res, 400, { valid: false, reason: 'converted', message: 'This slot has already been confirmed' });
    }

    if (joinReq.scrim.filledSlots >= joinReq.scrim.slotCount) {
      return sendResponse(res, 400, { valid: false, reason: 'full', message: 'This scrim is already full' });
    }

    // Check if requesting user is the intended recipient
    if (req.user._id.toString() !== joinReq.requestedBy.toString()) {
      // Check if user is part of the team
      const team = await Team.findById(joinReq.team);
      const isMember = team?.members.find(m => m.user.toString() === req.user._id.toString());
      if (!isMember) {
        return sendResponse(res, 403, { valid: false, reason: 'unauthorized', message: 'This invite link is not for your account' });
      }
    }

    sendResponse(res, 200, {
      valid: true,
      joinRequest: joinReq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Consume invite token (confirm slot)
// @route   POST /api/join-requests/invite/:token/consume
const consumeInviteToken = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const joinReq = await ScrimJoinRequest.findOne({ privateInviteToken: req.params.token }).session(session);
    if (!joinReq) throw new AppError('Invalid invite link', 404);

    if (joinReq.privateInviteUsedAt) throw new AppError('This invite link has already been used', 400);
    if (joinReq.privateInviteExpiresAt && new Date() > joinReq.privateInviteExpiresAt) {
      throw new AppError('This invite link has expired. Contact the organizer for a new one.', 400);
    }
    if (joinReq.status === 'converted') throw new AppError('Slot already confirmed', 400);

    // Verify user
    if (req.user._id.toString() !== joinReq.requestedBy.toString()) {
      const team = await Team.findById(joinReq.team).session(session);
      const isMember = team?.members.find(m => m.user.toString() === req.user._id.toString());
      if (!isMember) throw new AppError('This invite link is not for your account', 403);
    }

    const scrim = await Scrim.findById(joinReq.scrim).session(session);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (scrim.filledSlots >= scrim.slotCount) throw new AppError('Scrim is already full', 400);

    // Check duplicate registration
    const existingReg = await Registration.findOne({
      scrim: joinReq.scrim,
      team: joinReq.team,
      status: { $nin: ['cancelled', 'refunded'] }
    }).session(session);
    if (existingReg) throw new AppError('Team is already registered for this scrim', 400);

    // Create registration
    scrim.filledSlots += 1;
    const slotNumber = scrim.filledSlots;
    scrim.registrationCount += 1;
    if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
    await scrim.save({ session });

    const [registration] = await Registration.create([{
      scrim: joinReq.scrim,
      team: joinReq.team,
      registeredBy: joinReq.requestedBy,
      status: 'approved',
      slotNumber,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      joinRequest: joinReq._id,
      originMethod: 'invite_link'
    }], { session });

    // Update join request
    joinReq.status = 'converted';
    joinReq.privateInviteUsedAt = new Date();
    joinReq.assignedSlotNumber = slotNumber;
    await joinReq.save({ session });

    await session.commitTransaction();

    // Send system message (outside transaction)
    if (joinReq.conversation) {
      const sysMsg = await Message.create({
        conversation: joinReq.conversation,
        sender: req.user._id,
        type: 'system',
        content: `✅ Slot #${slotNumber} confirmed successfully!`
      });

      await Conversation.findByIdAndUpdate(joinReq.conversation, {
        lastMessage: { text: `✅ Slot #${slotNumber} confirmed`, sender: req.user._id, createdAt: sysMsg.createdAt }
      });

      const io = getIO(req);
      if (io) {
        io.to(`conv_${joinReq.conversation}`).emit('new_message', sysMsg);
      }
    }

    sendResponse(res, 200, {
      message: `Slot #${slotNumber} confirmed successfully!`,
      registration,
      slotNumber
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all organizer's join requests across scrims
// @route   GET /api/join-requests/organizer
const getOrganizerJoinRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { organizer: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const requests = await ScrimJoinRequest.find(query)
      .populate('scrim', 'title date startTime status filledSlots slotCount')
      .populate('requestedBy', 'username ign avatar')
      .populate('team', 'name tag logo members')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ScrimJoinRequest.countDocuments(query);

    sendResponse(res, 200, {
      requests,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJoinRequest,
  getMyJoinRequests,
  getScrimJoinRequests,
  updateJoinRequestStatus,
  generateInviteLink,
  validateInviteToken,
  consumeInviteToken,
  getOrganizerJoinRequests
};
