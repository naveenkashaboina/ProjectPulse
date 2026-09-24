const { v4: uuidv4 } = require('uuid');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, logActivity } = require('../utils/helpers');
const { Organization, OrgMembership, User, ActivityLog, Notification } = require('../models');
const config = require('../config/env');

/**
 * POST /api/organizations
 */
exports.createOrganization = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  const org = await Organization.create({
    name,
    description,
    owner: req.user._id,
  });

  await OrgMembership.create({
    user: req.user._id,
    organization: org._id,
    role: 'OrgAdmin',
    status: 'active',
  });

  sendResponse(res, 201, org);
});

/**
 * GET /api/organizations/:orgId
 */
exports.getOrganization = catchAsync(async (req, res, next) => {
  const org = await Organization.findById(req.params.orgId).populate('owner', 'name email avatar');
  if (!org) {
    return next(new AppError('Organization not found', 404, 'ORG_NOT_FOUND'));
  }
  sendResponse(res, 200, org);
});

/**
 * PUT /api/organizations/:orgId
 */
exports.updateOrganization = catchAsync(async (req, res, next) => {
  const { name, description, settings } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (settings !== undefined) update.settings = settings;

  const org = await Organization.findByIdAndUpdate(req.params.orgId, update, {
    new: true,
    runValidators: true,
  });

  if (!org) {
    return next(new AppError('Organization not found', 404, 'ORG_NOT_FOUND'));
  }

  sendResponse(res, 200, org);
});

/**
 * GET /api/organizations/:orgId/members
 */
exports.getMembers = catchAsync(async (req, res, next) => {
  const members = await OrgMembership.find({
    organization: req.params.orgId,
    status: 'active',
  }).populate('user', 'name email avatar');

  sendResponse(res, 200, members);
});

/**
 * POST /api/organizations/:orgId/invitations
 */
exports.inviteMember = catchAsync(async (req, res, next) => {
  const { email, role } = req.body;
  const orgId = req.params.orgId;

  // Check if user already exists
  const existingUser = await User.findOne({ email });

  // Check if already a member
  if (existingUser) {
    const existingMembership = await OrgMembership.findOne({
      user: existingUser._id,
      organization: orgId,
    });
    if (existingMembership && existingMembership.status === 'active') {
      return next(new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER'));
    }
  }

  const inviteToken = uuidv4();

  if (existingUser) {
    // Create or update membership as invited
    await OrgMembership.findOneAndUpdate(
      { user: existingUser._id, organization: orgId },
      {
        user: existingUser._id,
        organization: orgId,
        role,
        invitedBy: req.user._id,
        status: 'invited',
        inviteToken,
        inviteEmail: email,
      },
      { upsert: true, new: true }
    );

    // Create notification for existing user
    await Notification.create({
      user: existingUser._id,
      type: 'invitation',
      title: 'Organization Invitation',
      message: `You've been invited to join an organization as ${role}`,
      payload: { orgId, inviteToken },
      link: `/invitations/${inviteToken}/accept`,
    });
  } else {
    // Create placeholder membership
    await OrgMembership.create({
      organization: orgId,
      role,
      invitedBy: req.user._id,
      status: 'invited',
      inviteToken,
      inviteEmail: email,
    });
  }

  // In production, send email. For dev, log the invite link.
  if (config.NODE_ENV !== 'test') {
    console.log(`\n📧 Invite link for ${email}: /api/invitations/${inviteToken}/accept\n`);
  }

  await logActivity(ActivityLog, {
    organization: orgId,
    actor: req.user._id,
    action: 'member_added',
    entityType: 'Member',
    entityId: existingUser?._id || orgId,
    metadata: { email, role, status: 'invited' },
  });

  sendResponse(res, 201, {
    message: 'Invitation sent successfully',
    inviteToken: process.env.NODE_ENV !== 'production' ? inviteToken : undefined,
  });
});

/**
 * GET /api/invitations/:token
 */
exports.getInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const membership = await OrgMembership.findOne({ inviteToken: token })
    .select('+inviteToken')
    .populate('organization', 'name description');

  if (!membership) {
    return next(new AppError('Invalid or expired invitation token', 404, 'INVALID_TOKEN'));
  }

  if (membership.status === 'active') {
    return next(new AppError('This invitation has already been accepted', 400, 'ALREADY_ACCEPTED'));
  }

  sendResponse(res, 200, {
    organization: membership.organization,
    role: membership.role,
    email: membership.inviteEmail,
  });
});

/**
 * POST /api/invitations/:token/accept
 */
exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const membership = await OrgMembership.findOne({ inviteToken: token })
    .select('+inviteToken')
    .populate('organization');

  if (!membership) {
    return next(new AppError('Invalid or expired invitation token', 400, 'INVALID_TOKEN'));
  }

  if (membership.status === 'active') {
    return next(new AppError('This invitation has already been accepted', 400, 'ALREADY_ACCEPTED'));
  }

  // If user is authenticated, assign membership to them
  if (req.user) {
    membership.user = req.user._id;
    membership.status = 'active';
    membership.inviteToken = null;
    await membership.save();

    sendResponse(res, 200, {
      message: 'Invitation accepted',
      organization: membership.organization,
      role: membership.role,
    });
  } else {
    // Return info to prompt signup/login
    sendResponse(res, 200, {
      message: 'Please sign up or log in to accept this invitation',
      requiresAuth: true,
      inviteToken: token,
      organization: membership.organization,
      role: membership.role,
    });
  }
});

/**
 * PUT /api/organizations/:orgId/members/:userId/role
 */
exports.updateMemberRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const { orgId, userId } = req.params;

  const membership = await OrgMembership.findOne({
    user: userId,
    organization: orgId,
    status: 'active',
  });

  if (!membership) {
    return next(new AppError('Member not found', 404, 'MEMBER_NOT_FOUND'));
  }

  const org = await Organization.findById(orgId);
  if (!org) {
    return next(new AppError('Organization not found', 404, 'ORG_NOT_FOUND'));
  }

  // Prevent demoting the organization owner from OrgAdmin
  if (org.owner.toString() === userId && role !== 'OrgAdmin') {
    return next(new AppError('Cannot change the role of the organization owner from OrgAdmin', 400, 'CANNOT_DEMOTE_OWNER'));
  }

  membership.role = role;
  await membership.save();

  sendResponse(res, 200, membership);
});

/**
 * DELETE /api/organizations/:orgId/members/:userId
 */
exports.removeMember = catchAsync(async (req, res, next) => {
  const { orgId, userId } = req.params;

  // Can't remove yourself if you're the owner
  const org = await Organization.findById(orgId);
  if (org.owner.toString() === userId) {
    return next(new AppError('Cannot remove the organization owner', 400, 'CANNOT_REMOVE_OWNER'));
  }

  await OrgMembership.findOneAndDelete({
    user: userId,
    organization: orgId,
  });

  await logActivity(ActivityLog, {
    organization: orgId,
    actor: req.user._id,
    action: 'member_removed',
    entityType: 'Member',
    entityId: userId,
    metadata: { removedUserId: userId },
  });

  sendResponse(res, 200, { message: 'Member removed successfully' });
});
