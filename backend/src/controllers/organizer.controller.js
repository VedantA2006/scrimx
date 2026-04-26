const User = require('../models/User');
const Scrim = require('../models/Scrim');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

// @desc    Update organizer profile
// @route   PUT /api/organizers/profile
const updateOrganizerProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'organizer') {
      throw new AppError('Not an organizer', 403);
    }

    const allowed = ['displayName', 'bio', 'brandAccent', 'discord', 'telegram', 'instagram', 'youtube', 'contactEmail', 'upiId'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        user.organizerProfile[field] = req.body[field];
      }
    });

    // Update top-level user fields (realName, phone for identity verification)
    if (req.body.realName !== undefined) user.realName = req.body.realName;
    if (req.body.phone !== undefined) user.phone = req.body.phone;

    // Accept string URLs from body explicitly (if they clear them or paste old URLs)
    if (req.body.logo !== undefined) user.organizerProfile.logo = req.body.logo;
    if (req.body.banner !== undefined) user.organizerProfile.banner = req.body.banner;

    // Handle actual Multipart Image Uploads from Multer/Cloudinary
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        user.organizerProfile.logo = req.files.logo[0].path;
      }
      if (req.files.banner && req.files.banner[0]) {
        user.organizerProfile.banner = req.files.banner[0].path;
      }
      if (req.files.avatar && req.files.avatar[0]) {
        user.avatar = req.files.avatar[0].path;
      }
    }

    // Update slug
    if (req.body.slug) {
      const slug = req.body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const existing = await User.findOne({ 'organizerProfile.slug': slug, _id: { $ne: user._id } });
      if (existing) throw new AppError('Slug already taken', 400);
      user.organizerProfile.slug = slug;
    }

    await user.save();
    sendResponse(res, 200, { message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organizer by slug (public)
// @route   GET /api/organizers/:slug
const getOrganizerBySlug = async (req, res, next) => {
  try {
    const user = await User.findOne({
      'organizerProfile.slug': req.params.slug,
      role: 'organizer',
      isActive: true
    });
    if (!user) throw new AppError('Organizer not found', 404);

    const totalScrims = await Scrim.countDocuments({ organizer: user._id });
    const completedScrims = await Scrim.countDocuments({ organizer: user._id, status: 'completed' });
    const ongoingScrims = await Scrim.countDocuments({ organizer: user._id, status: { $ne: 'completed' } });
    
    const organizerData = user.toObject();
    if (organizerData.organizerProfile) {
      organizerData.organizerProfile.totalScrimsHosted = totalScrims;
      organizerData.organizerProfile.completedScrims = completedScrims;
      organizerData.organizerProfile.ongoingScrims = ongoingScrims;

      delete organizerData.organizerProfile.subscription;
      delete organizerData.organizerProfile.telegramChatId;
      delete organizerData.organizerProfile.telegramOTP;
      delete organizerData.organizerProfile.telegramOTPExpiry;
      delete organizerData.organizerProfile.pointsWallet;
    }
    delete organizerData.wallet;
    delete organizerData.email;
    delete organizerData.phone;
    delete organizerData.realName;

    sendResponse(res, 200, { organizer: organizerData });
  } catch (error) {
    next(error);
  }
};

// @desc    List organizers (public)
// @route   GET /api/organizers
const getOrganizers = async (req, res, next) => {
  try {
    const { search, verified, page = 1, limit = 20, sort = '-organizerProfile.totalScrimsHosted' } = req.query;
    const query = { role: 'organizer', isActive: true, isBanned: false };

    if (search) {
      query.$or = [
        { 'organizerProfile.displayName': { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified === 'true') query['organizerProfile.isVerified'] = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const organizers = await User.find(query)
      .select('username avatar organizerProfile createdAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { organizers }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify organizer (admin)
// @route   PUT /api/organizers/:id/verify
const verifyOrganizer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'organizer') throw new AppError('Organizer not found', 404);

    user.organizerProfile.isVerified = !user.organizerProfile.isVerified;
    await user.save();

    sendResponse(res, 200, {
      message: user.organizerProfile.isVerified ? 'Organizer verified' : 'Verification removed',
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateOrganizerProfile, getOrganizerBySlug, getOrganizers, verifyOrganizer };
