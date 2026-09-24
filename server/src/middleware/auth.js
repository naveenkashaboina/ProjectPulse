const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { User, OrgMembership, ProjectMembership, Project } = require('../models');

/**
 * Verify JWT and attach req.user
 */
const authenticate = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401, 'AUTH_REQUIRED'));
  }

  const decoded = jwt.verify(token, config.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
  }

  req.user = user;
  next();
});

/**
 * Check organization-level role.
 * Must be used AFTER authenticate and on routes with :orgId param.
 */
const requireRole = (...allowedRoles) => {
  return catchAsync(async (req, res, next) => {
    const orgId = req.params.orgId || req.body.organization;

    if (!orgId) {
      return next(new AppError('Organization ID is required', 400, 'MISSING_ORG_ID'));
    }

    const membership = await OrgMembership.findOne({
      user: req.user._id,
      organization: orgId,
      status: 'active',
    });

    if (!membership) {
      return next(new AppError('You are not a member of this organization', 403, 'NOT_ORG_MEMBER'));
    }

    if (!allowedRoles.includes(membership.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'INSUFFICIENT_ROLE')
      );
    }

    req.orgMembership = membership;
    next();
  });
};

/**
 * Check project-level access.
 * Must be used AFTER authenticate and on routes with :projectId param.
 * OrgAdmins always pass.
 * 
 * @param {string} action - The action to check: 'view', 'edit', 'manage', 'admin'
 */
const requireProjectAccess = (action = 'view') => {
  // Map actions to allowed roles
  const actionRoles = {
    view: ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'],
    comment: ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'],
    edit: ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer'],
    manage: ['OrgAdmin', 'ProjectManager', 'TeamLead'],
    admin: ['OrgAdmin', 'ProjectManager'],
  };

  const allowedRoles = actionRoles[action] || actionRoles.view;

  return catchAsync(async (req, res, next) => {
    const projectId = req.params.projectId;

    if (!projectId) {
      return next(new AppError('Project ID is required', 400, 'MISSING_PROJECT_ID'));
    }

    // Get the project to find its org
    const project = await Project.findById(projectId);
    if (!project) {
      return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    }

    req.project = project;

    // Check if user is an OrgAdmin for this project's org — they always pass
    const orgMembership = await OrgMembership.findOne({
      user: req.user._id,
      organization: project.organization,
      status: 'active',
    });

    if (orgMembership && orgMembership.role === 'OrgAdmin') {
      req.orgMembership = orgMembership;
      req.projectRole = 'OrgAdmin';
      return next();
    }

    // Check project-level membership
    const projectMembership = await ProjectMembership.findOne({
      user: req.user._id,
      project: projectId,
    });

    if (!projectMembership) {
      return next(new AppError('You do not have access to this project', 403, 'NO_PROJECT_ACCESS'));
    }

    if (!allowedRoles.includes(projectMembership.role)) {
      return next(
        new AppError('You do not have permission to perform this action on this project', 403, 'INSUFFICIENT_PROJECT_ROLE')
      );
    }

    req.orgMembership = orgMembership;
    req.projectMembership = projectMembership;
    req.projectRole = projectMembership.role;
    next();
  });
};

/**
 * Ensure user is a member of the organization (any role).
 * Used for org-scoped list endpoints.
 */
const requireOrgMember = catchAsync(async (req, res, next) => {
  const orgId = req.params.orgId;

  if (!orgId) {
    return next(new AppError('Organization ID is required', 400, 'MISSING_ORG_ID'));
  }

  const membership = await OrgMembership.findOne({
    user: req.user._id,
    organization: orgId,
    status: 'active',
  });

  if (!membership) {
    return next(new AppError('You are not a member of this organization', 403, 'NOT_ORG_MEMBER'));
  }

  req.orgMembership = membership;
  next();
});

module.exports = {
  authenticate,
  requireRole,
  requireProjectAccess,
  requireOrgMember,
};
