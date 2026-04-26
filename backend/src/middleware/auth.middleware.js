const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./error.middleware');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AppError('Not authorized - no token', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive || user.isBanned) {
      throw new AppError('Account is suspended or banned', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Please log in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.isOperational) return next(error);
    next(new AppError('Not authorized', 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Admin gets full unrestricted access
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized for this action', 403));
    }
    next();
  };
};

const attachOrganizerTier = (req, res, next) => {
  const { getOrganizerTierInfo } = require('../utils/organizerTier');
  req.organizerTier = getOrganizerTierInfo(req.user);
  next();
};

module.exports = { protect, authorize, attachOrganizerTier };
