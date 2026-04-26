const Notification = require('../models/Notification');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Get my notifications
// @route   GET /api/notifications
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    sendResponse(res, 200, { notifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    sendResponse(res, 200, { message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) throw new AppError('Notification not found', 404);
    sendResponse(res, 200, { notification });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAllAsRead, markAsRead };
