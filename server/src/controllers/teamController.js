const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, logActivity } = require('../utils/helpers');
const { Team, OrgMembership, ActivityLog } = require('../models');

/**
 * POST /api/organizations/:orgId/teams
 */
exports.createTeam = catchAsync(async (req, res, next) => {
  const { name, description, members, lead } = req.body;

  const team = await Team.create({
    organization: req.params.orgId,
    name,
    description,
    members: members || [],
    lead,
  });

  await logActivity(ActivityLog, {
    organization: req.params.orgId,
    actor: req.user._id,
    action: 'created',
    entityType: 'Team',
    entityId: team._id,
    metadata: { teamName: name },
  });

  const populated = await team.populate([
    { path: 'members', select: 'name email avatar' },
    { path: 'lead', select: 'name email avatar' },
  ]);

  sendResponse(res, 201, populated);
});

/**
 * GET /api/organizations/:orgId/teams
 */
exports.getTeams = catchAsync(async (req, res, next) => {
  const teams = await Team.find({ organization: req.params.orgId })
    .populate('members', 'name email avatar')
    .populate('lead', 'name email avatar');

  sendResponse(res, 200, teams);
});

/**
 * GET /api/teams/:teamId
 */
exports.getTeam = catchAsync(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId)
    .populate('members', 'name email avatar')
    .populate('lead', 'name email avatar');

  if (!team) {
    return next(new AppError('Team not found', 404, 'TEAM_NOT_FOUND'));
  }

  sendResponse(res, 200, team);
});

/**
 * PUT /api/teams/:teamId
 */
exports.updateTeam = catchAsync(async (req, res, next) => {
  const { name, description, members, lead } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (members !== undefined) update.members = members;
  if (lead !== undefined) update.lead = lead;

  const team = await Team.findByIdAndUpdate(req.params.teamId, update, {
    new: true,
    runValidators: true,
  })
    .populate('members', 'name email avatar')
    .populate('lead', 'name email avatar');

  if (!team) {
    return next(new AppError('Team not found', 404, 'TEAM_NOT_FOUND'));
  }

  sendResponse(res, 200, team);
});

/**
 * DELETE /api/teams/:teamId
 */
exports.deleteTeam = catchAsync(async (req, res, next) => {
  const team = await Team.findByIdAndDelete(req.params.teamId);

  if (!team) {
    return next(new AppError('Team not found', 404, 'TEAM_NOT_FOUND'));
  }

  await logActivity(ActivityLog, {
    organization: team.organization,
    actor: req.user._id,
    action: 'deleted',
    entityType: 'Team',
    entityId: team._id,
    metadata: { teamName: team.name },
  });

  sendResponse(res, 200, { message: 'Team deleted successfully' });
});
