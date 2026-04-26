const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

let ioInstance = null;

const setupSocket = (io) => {
  ioInstance = io;

  // JWT Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow unauthenticated connections for public scrim chat
        socket.user = null;
        return next();
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username role');
      if (!user) return next(new Error('User not found'));
      
      socket.user = user;
      next();
    } catch (err) {
      // Allow connection but without user context
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?._id;
    
    // Join user's personal room for notifications
    if (userId) {
      socket.join(`user_${userId}`);
    }

    // === SCRIM LIVE CHAT (legacy) ===
    socket.on('join_scrim', async (scrimId) => {
      if (!userId) return;
      try {
        const Registration = require('./models/Registration');
        const Team = require('./models/Team');
        const Scrim = require('./models/Scrim');
        const myTeams = await Team.find({ 'members.user': userId }).select('_id');
        const isApproved = await Registration.exists({
          scrim: scrimId,
          team: { $in: myTeams.map(t => t._id) },
          status: 'approved'
        });
        const isOrganizer = await Scrim.exists({ _id: scrimId, organizer: userId });
        if (!isApproved && !isOrganizer && socket.user?.role !== 'admin') return;
        socket.join(`scrim_${scrimId}`);
      } catch (err) {
        console.error('join_scrim validation error:', err.message);
      }
    });

    socket.on('leave_scrim', (scrimId) => {
      socket.leave(`scrim_${scrimId}`);
    });

    socket.on('scrim_message', (data) => {
      if (!socket.user) return;
      const payload = {
        scrimId: data.scrimId,
        content: typeof data.content === 'string'
          ? data.content.trim().substring(0, 500)
          : '',
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          role: socket.user.role
        },
        createdAt: new Date().toISOString()
      };
      if (!payload.content) return;
      io.to(`scrim_${data.scrimId}`).emit('scrim_message', payload);
    });

    // === TOURNAMENT COMMUNITY CHAT ===
    socket.on('join_tournament_chat', (tournamentId) => {
      socket.join(`tournament_${tournamentId}`);
    });

    socket.on('leave_tournament_chat', (tournamentId) => {
      socket.leave(`tournament_${tournamentId}`);
    });

    socket.on('tournament_message', async (data) => {
      if (!socket.user) return;
      const TournamentChat = require('./models/TournamentChat');
      const payload = {
        tournamentId: data.tournamentId,
        content: data.content,
        type: data.type || 'message',
        attachment: data.attachment || null,
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          role: socket.user.role,
        },
        createdAt: new Date().toISOString(),
      };
      io.to(`tournament_${data.tournamentId}`).emit('tournament_message', payload);

      // Persist to DB
      try {
        await TournamentChat.create({
          tournamentId: data.tournamentId,
          sender: socket.user._id,
          content: data.content || '',
          type: data.type || 'message',
          attachment: data.attachment || null,
          scope: 'tournament',
        });
      } catch (err) { console.error('[TournamentChat persist]', err.message); }
    });

    // === GROUP ISOLATED CHAT ===
    socket.on('join_group_chat', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    socket.on('leave_group_chat', (groupId) => {
      socket.leave(`group_${groupId}`);
    });

    socket.on('group_message', async (data) => {
      if (!socket.user) return;
      const TournamentChat = require('./models/TournamentChat');
      const payload = {
        groupId: data.groupId,
        content: data.content,
        type: data.type || 'message',
        attachment: data.attachment || null,
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          role: socket.user.role,
        },
        createdAt: new Date().toISOString(),
      };
      io.to(`group_${data.groupId}`).emit('group_message', payload);

      // Persist to DB — resolve tournamentId from group
      try {
        const TournamentGroup = require('./models/TournamentGroup');
        const group = await TournamentGroup.findById(data.groupId).select('tournamentId').lean();
        await TournamentChat.create({
          tournamentId: group?.tournamentId,
          groupId: data.groupId,
          sender: socket.user._id,
          content: data.content || '',
          type: data.type || 'message',
          attachment: data.attachment || null,
          scope: 'group',
        });
      } catch (err) { console.error('[GroupChat persist]', err.message); }
    });

    // === CONVERSATION CHAT (new) ===
    socket.on('join_conversation', (conversationId) => {
      if (!userId) return;
      socket.join(`conv_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      if (!userId) return;
      
      try {
        const { conversationId, type = 'text' } = data;
        let { content } = data;
        if (!content || typeof content !== 'string') return;
        content = content.trim().substring(0, 2000);
        if (!content || !conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        if (!conversation.participants.some(p => p.toString() === userId.toString())) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type,
          content,
          readBy: [userId]
        });

        // Update conversation
        const unreadUpdates = {};
        conversation.participants.forEach(p => {
          if (p.toString() !== userId.toString()) {
            unreadUpdates[`unreadCounts.${p}`] = 1;
          }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: { text: content.trim(), sender: userId, createdAt: message.createdAt },
          $inc: unreadUpdates
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username avatar role ign organizerProfile.displayName');

        io.to(`conv_${conversationId}`).emit('new_message', populated);

        // Notify other participants
        conversation.participants.forEach(p => {
          if (p.toString() !== userId.toString()) {
            io.to(`user_${p}`).emit('conversation_updated', {
              conversationId,
              lastMessage: { text: content.trim(), sender: userId, createdAt: message.createdAt }
            });
          }
        });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
      }
    });

    socket.on('mark_read', async (conversationId) => {
      if (!userId) return;
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        
        conversation.unreadCounts.set(userId.toString(), 0);
        await conversation.save();

        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
      } catch (err) {
        console.error('Socket mark_read error:', err.message);
      }
    });

    socket.on('typing', (data) => {
      if (!userId) return;
      const { conversationId } = data;
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        username: socket.user?.username
      });
    });

    socket.on('stop_typing', (data) => {
      if (!userId) return;
      const { conversationId } = data;
      socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId
      });
    });

    socket.on('disconnect', () => {
      // Cleanup handled by socket.io
    });
  });
};

const getIO = () => ioInstance;

module.exports = { setupSocket, getIO };
