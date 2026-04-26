const ScrimChat = require('../models/ScrimChat');
const Scrim = require('../models/Scrim');

// Get chat history for a scrim
exports.getScrimChatHistory = async (req, res) => {
  try {
    const { scrimId } = req.params;

    // Optional: check if user is allowed (organizer or registered)
    // For simplicity we just return the chat, UI handles hiding if not allowed

    const messages = await ScrimChat.find({ scrimId })
      .populate('sender', 'username ign role avatar')
      .sort({ createdAt: 1 }) // oldest to newest
      .limit(200);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
};
