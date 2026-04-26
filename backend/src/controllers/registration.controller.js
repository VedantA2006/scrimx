const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Scrim = require('../models/Scrim');
const Team = require('../models/Team');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');
const { sendSlotRequestAlert } = require('../services/telegram.service');

const UTR_REGEX = /^[A-Z0-9]{12}$/i;
const PAID_REG_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes


// @desc    Register for scrim (ATOMIC - MongoDB Transaction)
// @route   POST /api/registrations
const registerForScrim = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { scrimId, teamId } = req.body;

    // Lock the scrim document inside transaction
    const scrim = await Scrim.findById(scrimId).session(session);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (!['registrations_open'].includes(scrim.status)) throw new AppError('Registrations are not open', 400);
    if (scrim.filledSlots >= scrim.slotCount) throw new AppError('All slots are filled', 400);

    // Block direct registration for paid scrims — must use UTR flow
    if (scrim.entryFee > 0) {
      throw new AppError(
        'This is a paid scrim. Use the paid registration flow with UTR submission.',
        400
      );
    }

    // Block direct registration for request_to_join scrims
    if (scrim.registrationMethod === 'request_to_join') {
      throw new AppError('This scrim uses request-to-join. Please use "Request Slot" to contact the organizer.', 400);
    }

    // Check if registration end time has passed
    if (scrim.date && scrim.endTime) {
      const [endH, endM] = scrim.endTime.split(':').map(Number);
      const endDate = new Date(scrim.date);
      endDate.setHours(endH, endM, 0, 0);

      if (scrim.startTime) {
        const [startH, startM] = scrim.startTime.split(':').map(Number);
        if (endH < startH) {
          endDate.setDate(endDate.getDate() + 1);
        }
      }

      if (new Date() > endDate) {
        throw new AppError('Registration period has ended', 400);
      }
    }

    const team = await Team.findById(teamId).session(session);
    if (!team) throw new AppError('Team not found', 404);
    if (team.members.length !== 4) throw new AppError('Your team must have exactly 4 members to register', 400);

    const isMember = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!isMember) throw new AppError('You are not a member of this team', 400);

    // Check duplicate registration
    const existing = await Registration.findOne({ scrim: scrimId, team: teamId }).session(session);
    if (existing) throw new AppError('Team already registered for this scrim', 400);

    const status = scrim.requireApproval ? 'pending' : 'approved';
    const slotNumber = status === 'approved' ? scrim.filledSlots + 1 : null;

    const [registration] = await Registration.create([{
      scrim: scrimId,
      team: teamId,
      registeredBy: req.user._id,
      status,
      slotNumber,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      originMethod: 'direct'
    }], { session });

    if (status === 'approved') {
      scrim.filledSlots += 1;
      scrim.registrationCount += 1;
      if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
    } else {
      scrim.registrationCount += 1;
    }
    await scrim.save({ session });

    // COMMIT - everything succeeded atomically
    await session.commitTransaction();

    sendResponse(res, 201, { message: `Registration ${status}`, registration });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Initiate a paid registration (Player sends UTR)
// @route   POST /api/registrations/paid
const initiatePaidRegistration = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { scrimId, teamId, utr } = req.body;

    // Validate UTR
    if (!utr || !UTR_REGEX.test(utr)) {
      throw new AppError('UTR is required and must be exactly 12 alphanumeric characters', 400);
    }

    if (!req.file) {
      throw new AppError('Payment screenshot is required', 400);
    }

    const scrim = await Scrim.findById(scrimId).session(session);
    if (!scrim) throw new AppError('Scrim not found', 404);
    if (!['registrations_open'].includes(scrim.status)) throw new AppError('Registrations are not open', 400);
    if (scrim.filledSlots >= scrim.slotCount) throw new AppError('All slots are filled', 400);
    if (scrim.entryFee <= 0) throw new AppError('This scrim is free. Use standard registration.', 400);

    const team = await Team.findById(teamId).session(session);
    if (!team) throw new AppError('Team not found', 404);
    if (team.members.length !== 4) throw new AppError('Your team must have exactly 4 members to register', 400);

    const isMember = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!isMember) throw new AppError('You are not a member of this team', 400);

    // Check duplicate team registration
    const existing = await Registration.findOne({ scrim: scrimId, team: teamId }).session(session);
    if (existing) throw new AppError('Team already registered for this scrim', 400);

    // Check duplicate UTR globally for this scrim to prevent reuse
    const utrUsed = await Registration.findOne({ scrim: scrimId, utr: utr.toUpperCase() }).session(session);
    if (utrUsed) throw new AppError('This UTR has already been submitted for this scrim', 400);

    const [registration] = await Registration.create([{
      scrim: scrimId,
      team: teamId,
      registeredBy: req.user._id,
      status: 'pending',
      paymentStatus: 'pending_verification',
      amountPaid: scrim.entryFee,
      utr: utr.toUpperCase(),
      paymentScreenshot: req.file ? req.file.path : null,
      originMethod: 'direct'
    }], { session });

    scrim.registrationCount += 1;
    await scrim.save({ session });

    await session.commitTransaction();

    // Notify organiser via Telegram after transaction commits successfully
    try {
      await sendSlotRequestAlert(registration, scrim, req.user);
    } catch (tgErr) {
      console.error('Failed to send slot alert to organiser:', tgErr.message);
    }

    sendResponse(res, 201, { message: 'Payment submitted for verification.', registration });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get registrations for a scrim (organizer)
// @route   GET /api/registrations/scrim/:scrimId
const getScrimRegistrations = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);

    let query = { scrim: req.params.scrimId };
    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      // Non-organizers only see approved
      query.status = 'approved';
    }

    const registrations = await Registration.find(query)
      .populate({
        path: 'team',
        select: 'name tag logo members',
        populate: { path: 'members.user', select: 'username ign uid avatar' }
      })
      .populate('registeredBy', 'username')
      .sort({ createdAt: 1 });

    sendResponse(res, 200, { registrations });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my registrations (player)
// @route   GET /api/registrations/my
const getMyRegistrations = async (req, res, next) => {
  try {
    // Find all teams the user belongs to
    const Team = require('../models/Team');
    const myTeams = await Team.find({ 'members.user': req.user._id, isActive: true }).select('_id');
    const teamIds = myTeams.map(t => t._id);

    // Find registrations where user registered OR user's team is registered
    const registrations = await Registration.find({
      $or: [
        { registeredBy: req.user._id },
        { team: { $in: teamIds } }
      ]
    })
      .populate({
        path: 'scrim',
        select: 'title date startTime endTime status entryFee prizePool format mode banner slotCount filledSlots numberOfMatches isElite isFeatured organizer',
        populate: {
          path: 'organizer',
          select: 'username organizerProfile.displayName organizerProfile.isVerified organizerProfile.plan'
        }
      })
      .populate('team', 'name tag logo')
      .sort({ createdAt: -1 });

    // Deduplicate (in case both conditions match)
    const seen = new Set();
    const unique = registrations.filter(r => {
      const id = r._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    sendResponse(res, 200, { registrations: unique });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject registration (organizer)
// @route   PUT /api/registrations/:id/status
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected', 'waitlisted'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const registration = await Registration.findById(req.params.id);
    if (!registration) throw new AppError('Registration not found', 404);

    const scrim = await Scrim.findById(registration.scrim);
    if (!scrim) throw new AppError('Scrim not found', 404);

    if (scrim.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    if (status === 'approved' && scrim.filledSlots >= scrim.slotCount) {
      throw new AppError('All slots are filled', 400);
    }

    // If approving, assign slot
    if (status === 'approved' && registration.status !== 'approved') {
      scrim.filledSlots += 1;
      registration.slotNumber = scrim.filledSlots;
      if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
      await scrim.save();
      registration.paymentStatus = 'verified';
    }

    // Entry fees in ScrimX are paid directly player→organiser via UPI.
    // The platform does not hold player funds. No server-side refund needed.

    registration.status = status;
    if (rejectionReason) registration.rejectionReason = rejectionReason;
    await registration.save();

    sendResponse(res, 200, { message: `Registration ${status}`, registration });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel registration (player)
// @route   PUT /api/registrations/:id/cancel
const cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) throw new AppError('Registration not found', 404);

    if (registration.registeredBy.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (['cancelled', 'refunded'].includes(registration.status)) {
      throw new AppError('Registration already cancelled', 400);
    }

    const scrim = await Scrim.findById(registration.scrim);

    // Entry fees in ScrimX are paid directly player→organiser via UPI.
    // The platform does not hold player funds. No server-side refund needed.

    // Free up slot
    if (registration.status === 'approved' && scrim) {
      scrim.filledSlots = Math.max(0, scrim.filledSlots - 1);
      if (scrim.status === 'full') scrim.status = 'registrations_open';
      await scrim.save();
    }

    registration.status = 'cancelled';
    await registration.save();

    sendResponse(res, 200, { message: 'Registration cancelled', registration });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public slot list (approved registrations) for a scrim
// @route   GET /api/registrations/scrim/:scrimId/public
const getPublicSlotList = async (req, res, next) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) throw new AppError('Scrim not found', 404);

    const registrations = await Registration.find({ scrim: req.params.scrimId, status: 'approved' })
      .populate({
        path: 'team',
        select: 'name tag logo members',
        populate: { path: 'members.user', select: 'username ign' }
      })
      .sort({ slotNumber: 1, createdAt: 1 });

    sendResponse(res, 200, { registrations });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit UTR for a paid registration
// @route   PUT /api/registrations/:id/utr
const submitUtr = async (req, res, next) => {
  try {
    const { utrNumber } = req.body;
    if (!utrNumber || utrNumber.length !== 12) {
      throw new AppError('UTR number must be exactly 12 characters', 400);
    }
    const registration = await Registration.findById(req.params.id);
    if (!registration) throw new AppError('Registration not found', 404);
    if (registration.registeredBy.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    registration.utrNumber = utrNumber;
    registration.utrSubmittedAt = Date.now();
    registration.paymentStatus = 'pending_verification';
    await registration.save();

    sendResponse(res, 200, { message: 'UTR submitted successfully', registration });
  } catch (error) {
    next(error);
  }
};

// @desc    Check in for a scrim
// @route   PUT /api/registrations/:id/checkin
const checkIn = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('scrim').populate('team');
    if (!registration) throw new AppError('Registration not found', 404);
    if (registration.registeredBy.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }
    if (registration.status !== 'approved') {
      throw new AppError('Registration must be approved to check in', 400);
    }

    const scrim = registration.scrim;
    if (!scrim.date || !scrim.startTime) {
       throw new AppError('Scrim time not properly configured', 400);
    }
    
    // Check if within 60 mins
    const [startH, startM] = scrim.startTime.split(':').map(Number);
    const startDate = new Date(scrim.date);
    startDate.setHours(startH, startM, 0, 0);

    const now = new Date();
    const diffMs = startDate - now;
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 60) {
      throw new AppError(`Check-in is only available 60 minutes before start (${Math.round(diffMins)} mins left)`, 400);
    }

    registration.checkedIn = true;
    registration.checkedInAt = Date.now();
    await registration.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${scrim.organizer.toString()}`).emit('player_checkedin', {
        registrationId: registration._id,
        teamName: registration.team.name,
        slotNumber: registration.slotNumber
      });
    }

    sendResponse(res, 200, { message: 'Checked in successfully', registration });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerForScrim, getScrimRegistrations, getMyRegistrations, updateRegistrationStatus, cancelRegistration, getPublicSlotList, initiatePaidRegistration, submitUtr, checkIn };
