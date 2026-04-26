const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Tournament = require('../models/Tournament');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

const getIO = (req) => req.app.get('io');

// @desc    Create or get existing direct conversation (player → organizer for a scrim or tournament)
// @route   POST /api/chat/conversations/open
const createOrGetConversation = async (req, res, next) => {
  try {
    const { scrimId, tournamentId, firstMessage } = req.body;
    const playerId = req.user._id;

    let organizerId, contextRef, contextType, contextTitle;

    if (scrimId) {
      const Scrim = require('../models/Scrim');
      const scrim = await Scrim.findById(scrimId).select('title organizer');
      if (!scrim) throw new AppError('Scrim not found', 404);
      organizerId = scrim.organizer;
      contextRef = { scrim: scrimId };
      contextType = 'scrim_inquiry';
      contextTitle = scrim.title;
    } else if (tournamentId) {
      const tournament = await Tournament.findById(tournamentId).select('title organizer');
      if (!tournament) throw new AppError('Tournament not found', 404);
      organizerId = tournament.organizer;
      contextRef = { tournament: tournamentId };
      contextType = 'tournament_inquiry';
      contextTitle = tournament.title;
    } else {
      throw new AppError('Either scrimId or tournamentId is required', 400);
    }

    if (playerId.toString() === organizerId.toString()) {
      throw new AppError('You cannot open a chat with yourself', 400);
    }

    // Look for existing conversation between these two for this context
    const searchQuery = {
      participants: { $all: [playerId, organizerId] },
      isActive: true,
      ...contextRef
    };

    let conversation = await Conversation.findOne(searchQuery)
      .populate('participants', 'username avatar role organizerProfile.displayName ign')
      .populate('scrim', 'title')
      .populate('tournament', 'title');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [playerId, organizerId],
        type: contextType,
        ...contextRef,
        isActive: true,
      });

      // Auto-send first message
      const msgText = firstMessage?.trim() || `Hi! I'm interested in getting a slot for "${contextTitle}". I need a slot — can you help me?`;
      const msg = await Message.create({
        conversation: conversation._id,
        sender: playerId,
        type: 'text',
        content: msgText,
        readBy: [playerId],
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: { text: msgText, sender: playerId, createdAt: msg.createdAt },
        [`unreadCounts.${organizerId}`]: 1
      });

      const io = getIO(req);
      if (io) {
        const populated = await Message.findById(msg._id).populate('sender', 'username avatar role ign');
        io.to(`conv_${conversation._id}`).emit('new_message', populated);
        io.to(`user_${organizerId}`).emit('conversation_updated', {
          conversationId: conversation._id,
          lastMessage: { text: msgText, sender: playerId, createdAt: msg.createdAt }
        });
      }

      // Re-fetch with populate
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar role organizerProfile.displayName ign')
        .populate('scrim', 'title')
        .populate('tournament', 'title');
    }

    const conv = conversation.toObject();
    conv.unreadCount = conversation.unreadCounts?.get(playerId.toString()) || 0;
    conv.otherParticipant = conversation.participants.find(p => p._id.toString() !== playerId.toString());

    sendResponse(res, 200, { conversation: conv });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's conversations
// @route   GET /api/chat/conversations
const getConversations = async (req, res, next) => {
  try {
    const { search } = req.query;

    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    })
      .populate('participants', 'username avatar role organizerProfile.displayName ign')
      .populate('scrim', 'title date startTime status')
      .populate('tournament', 'title')
      .populate('joinRequest', 'status')
      .sort({ updatedAt: -1 });

    let results = conversations;

    // Search filter (by other participant name or scrim title)
    if (search) {
      const q = search.toLowerCase();
      results = conversations.filter(c => {
        const otherUser = c.participants.find(p => p._id.toString() !== req.user._id.toString());
        const name = (otherUser?.organizerProfile?.displayName || otherUser?.username || '').toLowerCase();
        const scrimTitle = (c.scrim?.title || '').toLowerCase();
        return name.includes(q) || scrimTitle.includes(q);
      });
    }

    // Add computed fields
    const formatted = results.map(c => {
      const conv = c.toObject();
      conv.unreadCount = c.unreadCounts?.get(req.user._id.toString()) || 0;
      conv.otherParticipant = c.participants.find(p => p._id.toString() !== req.user._id.toString());
      return conv;
    });

    sendResponse(res, 200, { conversations: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
const getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);

    // Auth check
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      throw new AppError('Not authorized to view this conversation', 403);
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Message.countDocuments({ conversation: req.params.id });
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'username avatar role ign organizerProfile.displayName')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendResponse(res, 200, {
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message in conversation
// @route   POST /api/chat/conversations/:id/messages
const sendMessage = async (req, res, next) => {
  try {
    const { content, type = 'text' } = req.body;

    if (!content || !content.trim()) throw new AppError('Message content is required', 400);

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      throw new AppError('Not authorized', 403);
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type,
      content: content.trim(),
      readBy: [req.user._id]
    });

    // Update conversation last message + unread counts
    const unreadUpdates = {};
    conversation.participants.forEach(p => {
      if (p.toString() !== req.user._id.toString()) {
        unreadUpdates[`unreadCounts.${p}`] = 1;
      }
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: { text: content.trim(), sender: req.user._id, createdAt: message.createdAt },
      $inc: unreadUpdates
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar role ign organizerProfile.displayName');

    // Emit via socket
    const io = getIO(req);
    if (io) {
      io.to(`conv_${conversation._id}`).emit('new_message', populated);

      // Notify other participants
      conversation.participants.forEach(p => {
        if (p.toString() !== req.user._id.toString()) {
          io.to(`user_${p}`).emit('conversation_updated', {
            conversationId: conversation._id,
            lastMessage: { text: content.trim(), sender: req.user._id, createdAt: message.createdAt }
          });
        }
      });
    }

    sendResponse(res, 201, { message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload file/image to conversation
// @route   POST /api/chat/conversations/:id/upload
const uploadToConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      throw new AppError('Not authorized', 403);
    }

    if (!req.file) throw new AppError('No file uploaded', 400);

    const isImage = req.file.mimetype?.startsWith('image/');
    const msgType = isImage ? 'image' : 'file';

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type: msgType,
      content: req.body.caption || '',
      attachments: [{
        url: req.file.path,
        filename: req.file.originalname || 'file',
        mimetype: req.file.mimetype || '',
        size: req.file.size || 0
      }],
      readBy: [req.user._id]
    });

    const previewText = isImage ? '📷 Image' : '📎 File';
    const unreadUpdates = {};
    conversation.participants.forEach(p => {
      if (p.toString() !== req.user._id.toString()) {
        unreadUpdates[`unreadCounts.${p}`] = 1;
      }
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: { text: previewText, sender: req.user._id, createdAt: message.createdAt },
      $inc: unreadUpdates
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar role ign organizerProfile.displayName');

    const io = getIO(req);
    if (io) {
      io.to(`conv_${conversation._id}`).emit('new_message', populated);
    }

    sendResponse(res, 201, { message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark conversation as read
// @route   PATCH /api/chat/conversations/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      throw new AppError('Not authorized', 403);
    }

    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    // Mark messages as read
    await Message.updateMany(
      { conversation: req.params.id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    sendResponse(res, 200, { message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get total unread count
// @route   GET /api/chat/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    });

    let total = 0;
    conversations.forEach(c => {
      total += c.unreadCounts?.get(req.user._id.toString()) || 0;
    });

    sendResponse(res, 200, { unreadCount: total });
  } catch (error) {
    next(error);
  }
};

// @desc    Open a direct DM with any user (organizer → player etc.)
// @route   POST /api/chat/conversations/direct
const openDirectConversation = async (req, res, next) => {
  try {
    const { userId, firstMessage } = req.body;
    if (!userId) return next(new AppError('userId is required', 400));

    const senderId = req.user._id;
    if (senderId.toString() === userId.toString()) {
      return next(new AppError('Cannot open a chat with yourself', 400));
    }

    // Find or create direct conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, userId] },
      type: 'direct',
      isActive: true,
    }).populate('participants', 'username avatar role organizerProfile.displayName ign');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, userId],
        type: 'direct',
        isActive: true,
      });

      if (firstMessage?.trim()) {
        const msg = await Message.create({
          conversation: conversation._id,
          sender: senderId,
          type: 'text',
          content: firstMessage.trim(),
          readBy: [senderId],
        });
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: { text: firstMessage.trim(), sender: senderId, createdAt: msg.createdAt },
          [`unreadCounts.${userId}`]: 1
        });
        const io = getIO(req);
        if (io) {
          const populated = await Message.findById(msg._id).populate('sender', 'username avatar role ign');
          io.to(`conv_${conversation._id}`).emit('new_message', populated);
          io.to(`user_${userId}`).emit('conversation_updated', { conversationId: conversation._id });
        }
      }

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar role organizerProfile.displayName ign');
    }

    const conv = conversation.toObject();
    conv.otherParticipant = conversation.participants.find(p => p._id.toString() !== senderId.toString());
    conv.unreadCount = conversation.unreadCounts?.get(senderId.toString()) || 0;

    sendResponse(res, 200, { conversation: conv });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrGetConversation,
  openDirectConversation,
  getConversations,
  getMessages,
  sendMessage,
  uploadToConversation,
  markAsRead,
  getUnreadCount
};


