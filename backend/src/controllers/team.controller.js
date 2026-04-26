const Team = require('../models/Team');
const TeamApplication = require('../models/TeamApplication');
const TeamInvite = require('../models/TeamInvite');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse, sendPaginated } = require('../utils/response');

const checkGamingProfile = (user) => {
  if (!user.ign || !user.uid) {
    throw new AppError('Incomplete gaming profile. Please update your IGN and Game Custom UID in your Profile before performing this action.', 400);
  }
};

// @desc    Create team
const createTeam = async (req, res, next) => {
  try {
    const { name, tag, bio, banner, recruitmentMode } = req.body;
    let logo = req.body.logo;
    if (req.file) {
      logo = req.file.path;
    }

    checkGamingProfile(req.user);

    if (!name) throw new AppError('Team name is required', 400);

    const existing = await Team.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) throw new AppError('Team name already taken', 400);

    const team = await Team.create({
      name,
      tag: tag || name.substring(0, 4).toUpperCase(),
      bio, logo, banner, recruitmentMode: recruitmentMode || 'invite',
      captain: req.user._id,
      members: [{
        user: req.user._id,
        role: 'captain',
        ign: req.user.ign || '',
        uid: req.user.uid || '',
        device: req.user.device || ''
      }]
    });

    sendResponse(res, 201, { message: 'Team created', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my teams
const getMyTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({
      $or: [
        { captain: req.user._id },
        { 'members.user': req.user._id }
      ],
      isActive: true
    }).populate('members.user', 'username avatar ign uid device');

    sendResponse(res, 200, { teams });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team by ID
const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'username avatar ign uid device')
      .populate('captain', 'username avatar');

    if (!team) throw new AppError('Team not found', 404);
    sendResponse(res, 200, { team });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
const updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    const member = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || !['captain', 'co-captain'].includes(member.role)) {
      throw new AppError('Not authorized', 403);
    }

    const allowed = ['name', 'tag', 'bio', 'logo', 'banner', 'recruitmentMode'];
    allowed.forEach(f => { if (req.body[f] !== undefined) team[f] = req.body[f]; });
    
    if (req.file) {
      team.logo = req.file.path;
    }
    
    await team.save();

    sendResponse(res, 200, { message: 'Team updated', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member
const addMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    const isCaptain = team.members.find(m => m.user.toString() === req.user._id.toString() && ['captain', 'co-captain'].includes(m.role));
    if (!isCaptain) throw new AppError('Only captain can add members', 403);

    if (team.members.length >= team.maxMembers) throw new AppError('Team is full', 400);

    const { userId, role = 'player' } = req.body;
    if (team.members.find(m => m.user.toString() === userId)) {
      throw new AppError('User already in team', 400);
    }

    const newUser = await User.findById(userId).select('ign uid device');
    const updatedTeam = await Team.findOneAndUpdate(
      { _id: team._id, 'members.user': { $ne: userId } },
      {
        $push: {
          members: {
            user: userId,
            role,
            ign: newUser?.ign || '',
            uid: newUser?.uid || '',
            device: newUser?.device || ''
          }
        }
      },
      { new: true }
    );
    
    if (!updatedTeam) throw new AppError('User already in team or team not found', 400);

    sendResponse(res, 200, { message: 'Member added', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member
const removeMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    const isCaptain = team.captain.toString() === req.user._id.toString();
    const isSelf = req.params.userId === req.user._id.toString();

    if (!isCaptain && !isSelf) throw new AppError('Not authorized', 403);
    if (req.params.userId === team.captain.toString()) throw new AppError('Captain cannot be removed', 400);

    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();

    sendResponse(res, 200, { message: 'Member removed', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Search teams (public)
const searchTeams = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { tag: { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .populate('captain', 'username avatar')
      .sort({ totalPoints: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { teams }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find public teams for players
const findPublicTeams = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true, recruitmentMode: 'public' };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { tag: { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .populate('captain', 'username avatar ign uid')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    sendPaginated(res, 200, { teams }, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply to public team
const applyToTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || team.recruitmentMode !== 'public') {
      throw new AppError('Team is not accepting public applications', 400);
    }
    
    checkGamingProfile(req.user);

    if (team.members.find(m => m.user.toString() === req.user._id.toString())) {
      throw new AppError('You are already in this team', 400);
    }

    const currentApp = await TeamApplication.findOne({ team: team._id, player: req.user._id, status: 'pending' });
    if (currentApp) throw new AppError('You already have a pending application', 400);

    const application = await TeamApplication.create({
      team: team._id,
      player: req.user._id,
      message: req.body.message || ''
    });

    sendResponse(res, 201, { message: 'Application sent', application });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending applications for a team
const getTeamApplications = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    const member = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || !['captain', 'co-captain'].includes(member.role)) {
      throw new AppError('Not authorized', 403);
    }

    const applications = await TeamApplication.find({ team: team._id, status: 'pending' })
      .populate('player', 'username avatar ign uid realName phone device');

    sendResponse(res, 200, { applications });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept or reject application
const manageApplication = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);

    const application = await TeamApplication.findById(req.params.appId);
    if (!application) throw new AppError('Application not found', 404);

    const team = await Team.findById(application.team);
    const member = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || !['captain', 'co-captain'].includes(member.role)) {
      throw new AppError('Not authorized', 403);
    }

    if (status === 'accepted') {
      if (team.members.length >= team.maxMembers) throw new AppError('Team is full', 400);
      if (team.members.find(m => m.user.toString() === application.player.toString())) {
        throw new AppError('User already in team', 400);
      }
      const newUser = await User.findById(application.player).select('ign uid device');
      const updatedTeam = await Team.findOneAndUpdate(
        { _id: team._id, 'members.user': { $ne: application.player } },
        {
          $push: {
            members: {
              user: application.player,
              role: 'player',
              ign: newUser?.ign || '',
              uid: newUser?.uid || '',
              device: newUser?.device || ''
            }
          }
        },
        { new: true }
      );
      if (!updatedTeam) throw new AppError('User already in team or team not found', 400);
    }

    application.status = status;
    await application.save();

    sendResponse(res, 200, { message: `Application ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    if (team.captain.toString() !== req.user._id.toString()) {
      throw new AppError('Only the captain can delete the team', 403);
    }

    team.isActive = false;
    await team.save();

    sendResponse(res, 200, { message: 'Team deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Send invite to a player
const sendInvite = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) throw new AppError('Team not found', 404);

    if (team.captain.toString() !== req.user._id.toString()) {
      throw new AppError('Only the captain can send invites', 403);
    }

    const { playerId } = req.body;
    if (!playerId) throw new AppError('Player ID is required', 400);

    const player = await User.findById(playerId);
    if (!player) throw new AppError('Player not found', 404);

    // Check if player is already in team
    if (team.members.find(m => m.user.toString() === playerId)) {
      throw new AppError('Player is already in this team', 400);
    }

    // Check for existing pending invite
    const existing = await TeamInvite.findOne({ team: team._id, to: playerId, status: 'pending' });
    if (existing) throw new AppError('Invite already sent to this player', 400);

    if (team.members.length >= team.maxMembers) throw new AppError('Team is full', 400);

    const invite = await TeamInvite.create({
      team: team._id,
      from: req.user._id,
      to: playerId
    });

    sendResponse(res, 201, { message: 'Invite sent successfully', invite });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my pending invites (player side)
const getMyInvites = async (req, res, next) => {
  try {
    const invites = await TeamInvite.find({ to: req.user._id, status: 'pending' })
      .populate('team', 'name tag logo members')
      .populate('from', 'username avatar')
      .sort('-createdAt');

    sendResponse(res, 200, { invites });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to invite (accept / reject)
const respondToInvite = async (req, res, next) => {
  try {
    const invite = await TeamInvite.findById(req.params.inviteId);
    if (!invite) throw new AppError('Invite not found', 404);

    if (invite.to.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (invite.status !== 'pending') {
      throw new AppError('Invite already responded to', 400);
    }

    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      throw new AppError('Status must be accepted or rejected', 400);
    }

    if (status === 'accepted') {
      checkGamingProfile(req.user);
      
      const team = await Team.findById(invite.team);
      if (!team) throw new AppError('Team no longer exists', 404);
      if (team.members.length >= team.maxMembers) throw new AppError('Team is now full', 400);
      if (team.members.find(m => m.user.toString() === req.user._id.toString())) {
        throw new AppError('You are already in this team', 400);
      }

      const newUser = await User.findById(req.user._id).select('ign uid device');
      const updatedTeam = await Team.findOneAndUpdate(
        { _id: team._id, 'members.user': { $ne: req.user._id } },
        {
          $push: {
            members: {
              user: req.user._id,
              role: 'player',
              ign: newUser?.ign || '',
              uid: newUser?.uid || '',
              device: newUser?.device || ''
            }
          }
        },
        { new: true }
      );
      if (!updatedTeam) throw new AppError('User already in team or team not found', 400);
    }

    invite.status = status;
    await invite.save();

    sendResponse(res, 200, { message: `Invite ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team preview by invite code (for join page)
// @route   GET /api/teams/invite-link/:inviteCode
const getTeamByInviteCode = async (req, res, next) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.inviteCode, isActive: true })
      .populate('captain', 'username avatar')
      .select('name tag logo bio members captain inviteCode');

    if (!team) throw new AppError('Invalid or expired invite link', 404);

    sendResponse(res, 200, { team });
  } catch (error) {
    next(error);
  }
};

// @desc    Join team via invite code
// @route   POST /api/teams/invite-link/:inviteCode/join
const joinViaInviteCode = async (req, res, next) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.inviteCode, isActive: true });
    if (!team) throw new AppError('Invalid or expired invite link', 404);

    if (team.members.length >= team.maxMembers) throw new AppError('Team is full', 400);
    
    checkGamingProfile(req.user);

    if (team.members.find(m => m.user.toString() === req.user._id.toString())) {
      throw new AppError('You are already in this team', 400);
    }

    const updatedTeam = await Team.findOneAndUpdate(
      { _id: team._id, 'members.user': { $ne: req.user._id } },
      {
        $push: {
          members: {
            user: req.user._id,
            role: 'player',
            ign: req.user.ign || '',
            uid: req.user.uid || '',
            device: req.user.device || ''
          }
        }
      },
      { new: true }
    );
    if (!updatedTeam) throw new AppError('You are already in this team or team not found', 400);

    sendResponse(res, 200, { message: 'Successfully joined the team!', team });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team results
// @route   GET /api/teams/:id/results
const getTeamResults = async (req, res, next) => {
  try {
    const Result = require('../models/Result');
    const teamId = req.params.id;
    
    const results = await Result.find({
      'standings.team': teamId,
      status: { $in: ['pre_released', 'finalized'] }
    })
    .populate('scrim', 'title date startTime')
    .sort({ createdAt: -1 })
    .limit(10);

    const formatted = results.map(r => {
      const standing = r.standings.find(s => s.team.toString() === teamId);
      return {
        scrimId: r.scrim?._id,
        scrimTitle: r.scrim?.title,
        scrimDate: r.scrim?.date,
        place: standing?.place,
        totalKills: standing?.totalKillPoints || 0,
        totalPoints: standing?.totalPoints || 0,
        prizeWon: standing?.prizeWon || 0,
        status: r.status
      };
    });

    sendResponse(res, 200, { results: formatted });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTeam, getMyTeams, getTeam, updateTeam, deleteTeam, addMember, removeMember, searchTeams, findPublicTeams, applyToTeam, getTeamApplications, manageApplication, sendInvite, getMyInvites, respondToInvite, getTeamByInviteCode, joinViaInviteCode, getTeamResults };
