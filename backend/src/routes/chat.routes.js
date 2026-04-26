const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getScrimChatHistory } = require('../controllers/chat.controller');
const {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  uploadToConversation,
  markAsRead,
  getUnreadCount
} = require('../controllers/conversation.controller');
const { chatUpload } = require('../middleware/upload.middleware');

// Legacy scrim chat
router.get('/scrim/:scrimId', protect, getScrimChatHistory);

// New conversation-based chat
router.use(protect);

router.post('/conversations/open', createOrGetConversation);
router.post('/conversations/direct', require('../controllers/conversation.controller').openDirectConversation);

router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/upload', chatUpload.single('file'), uploadToConversation);
router.patch('/conversations/:id/read', markAsRead);

module.exports = router;
