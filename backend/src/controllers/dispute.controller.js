const Dispute = require('../models/Dispute');
const User = require('../models/User');
const Scrim = require('../models/Scrim');
const { AppError } = require('../middleware/error.middleware');
const { sendPaginated, sendResponse } = require('../utils/response');

// @desc    Raise a new dispute
// @route   POST /api/disputes
const raiseDispute = async (req, res, next) => {
  try {
    const { scrimId, againstId, reason, description, evidence } = req.body;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);

    // Ensure the user hasn't already raised a dispute for this scrim
    const existing = await Dispute.findOne({ scrim: scrimId, raisedBy: req.user._id });
    if (existing) {
      throw new AppError('You have already raised a dispute for this scrim', 400);
    }

    const dispute = await Dispute.create({
      scrim: scrimId,
      raisedBy: req.user._id,
      against: againstId || scrim.organizer, // Default to organizer if not specified
      reason,
      description,
      evidence: evidence || []
    });

    sendResponse(res, 201, { message: 'Dispute raised successfully. Our team will investigate.', dispute });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's disputes
// @route   GET /api/disputes/my
const getMyDisputes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Disputes raised by user OR against user
    const query = { $or: [{ raisedBy: req.user._id }, { against: req.user._id }] };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Dispute.countDocuments(query);
    const disputes = await Dispute.find(query)
      .populate('scrim', 'title date')
      .populate('against', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { disputes }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all disputes (Admin)
// @route   GET /api/disputes
const getAllDisputes = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Dispute.countDocuments(query);
    const disputes = await Dispute.find(query)
      .populate('scrim', 'title')
      .populate('raisedBy', 'username')
      .populate('against', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { disputes }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a dispute (Admin)
// @route   PUT /api/disputes/:id/resolve
const resolveDispute = async (req, res, next) => {
  try {
    const { status, adminNotes, penalizeAgainst } = req.body;
    
    const validStatuses = ['resolved_in_favor', 'resolved_against', 'dismissed'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid resolution status', 400);
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) throw new AppError('Dispute not found', 404);

    dispute.status = status;
    dispute.adminNotes = adminNotes;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();

    if (penalizeAgainst && dispute.against) {
      const againstUser = await User.findById(dispute.against);
      if (againstUser?.role === 'organizer' && againstUser.organizerProfile) {
        againstUser.organizerProfile.trustScore = Math.max(0, (againstUser.organizerProfile.trustScore || 50) - 10);
        await againstUser.save();
      }
      // Players have no reputation field — skip penalty for players
    }

    await dispute.save();
    
    sendResponse(res, 200, { message: `Dispute ${status}`, dispute });
  } catch (error) {
    next(error);
  }
};

module.exports = { raiseDispute, getMyDisputes, getAllDisputes, resolveDispute };
