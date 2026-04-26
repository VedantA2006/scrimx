const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      throw new AppError('Please provide username, email and password', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new AppError(
        existingUser.email === email ? 'Email already registered' : 'Username already taken',
        400
      );
    }

    const allowedRoles = ['player', 'organizer'];
    const userRole = allowedRoles.includes(role) ? role : 'player';

    const user = await User.create({
      username,
      email,
      password,
      role: userRole
    });

    // If organizer, set default slug and seed welcome credits
    if (userRole === 'organizer') {
      user.organizerProfile.slug = username.toLowerCase();
      user.organizerProfile.displayName = username;
      user.organizerProfile.pointsWallet = {
        balance: 150,
        totalAdded: 150,
        totalUsed: 0,
        lastUpdatedAt: new Date()
      };
      await user.save();

      // Create welcome bonus transaction record
      const OrganizerPointTransaction = require('../models/OrganizerPointTransaction');
      await OrganizerPointTransaction.create({
        organizer: user._id,
        type: 'credit',
        points: 150,
        balanceBefore: 0,
        balanceAfter: 150,
        reason: 'Welcome bonus — 150 free credits'
      });
    }

    const token = user.generateToken();

    sendResponse(res, 201, {
      message: 'Registration successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive || user.isBanned) {
      throw new AppError('Account is suspended or banned', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateToken();

    sendResponse(res, 200, {
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    sendResponse(res, 200, { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['username', 'avatar', 'banner', 'ign', 'uid', 'device', 'realName', 'phone', 'preferredRole', 'playStyle', 'sensitivity'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle file uploads (avatar and/or banner)
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        updates.avatar = req.files.avatar[0].path;
      }
      if (req.files.banner && req.files.banner[0]) {
        updates.banner = req.files.banner[0].path;
      }
    }
    // Fallback for single file upload
    if (req.file) {
      updates.avatar = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    sendResponse(res, 200, { message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current and new password', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateToken();

    sendResponse(res, 200, { message: 'Password changed successfully', token });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin special login
// @route   POST /api/auth/admin-login
const adminLogin = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw new AppError('Please provide admin password', 400);
    }

    const adminSecret = process.env.ADMIN_SPECIAL_PASSWORD;
    if (!adminSecret) {
      throw new AppError('Admin login is not configured', 503);
    }

    if (password !== adminSecret) {
      throw new AppError('Invalid admin password', 401);
    }

    // Find or create the admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@scrimx.com';
    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      const randomPwd = require('crypto').randomBytes(32).toString('hex');
      user = await User.create({
        username: 'superadmin',
        email: adminEmail,
        password: randomPwd, // random, never stored, login only via adminLogin
        role: 'admin',
        isActive: true
      });
    }

    const token = user.generateToken();

    sendResponse(res, 200, {
      message: 'Admin login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, adminLogin };
