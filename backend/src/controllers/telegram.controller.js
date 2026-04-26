const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');
const { sendMessage } = require('../services/telegram.service');

const OTP_EXPIRY_MINUTES = 10;

// @desc  Generate a linking code for the organiser
// @route POST /api/telegram/send-otp
const sendOtp = async (req, res, next) => {
  try {
    if (req.user.role !== 'organizer') throw new AppError('Only organisers can link Telegram', 403);

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = await User.findById(req.user._id);
    user.organizerProfile.telegramOTP = otp;
    user.organizerProfile.telegramOTPExpiry = expiry;
    await user.save();

    sendResponse(res, 200, {
      otp,
      message: 'Linking code generated successfully.',
      hint: 'Expires in 10 minutes'
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get Telegram link status
// @route GET /api/telegram/status
const getTelegramStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('organizerProfile.telegramVerified organizerProfile.telegramUsername');
    sendResponse(res, 200, {
      verified: user.organizerProfile?.telegramVerified || false,
      username: user.organizerProfile?.telegramUsername || ''
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOtp, getTelegramStatus };
