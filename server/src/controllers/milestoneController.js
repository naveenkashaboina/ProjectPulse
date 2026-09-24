const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, logActivity } = require('../utils/helpers');
const { Milestone, Project, ActivityLog } = require('../models');

/**
 * POST /api/projects/:projectId/milestones
 */
exports.createMilestone = catchAsync(async (req, res, next) => {
  const { title, description, dueDate, status } = req.body;
  const project = req.project;

  const milestone = await Milestone.create({
    project: req.params.projectId,
    title,
    description,
    dueDate,
    status: status || 'pending',
  });

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'created',
    entityType: 'Milestone',
    entityId: milestone._id,
    metadata: { title },
  });

  sendResponse(res, 201, milestone);
});

/**
 * GET /api/projects/:projectId/milestones
 */
exports.getMilestones = catchAsync(async (req, res, next) => {
  const milestones = await Milestone.find({ project: req.params.projectId })
    .sort({ dueDate: 1 });

  sendResponse(res, 200, milestones);
});

/**
 * GET /api/milestones/:milestoneId
 */
exports.getMilestone = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.milestoneId);
  if (!milestone) {
    return next(new AppError('Milestone not found', 404, 'MILESTONE_NOT_FOUND'));
  }
  sendResponse(res, 200, milestone);
});

/**
 * PUT /api/milestones/:milestoneId
 */
exports.updateMilestone = catchAsync(async (req, res, next) => {
  const allowed = ['title', 'description', 'dueDate', 'status'];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  if (update.status === 'completed') {
    update.completedAt = new Date();
  }

  const oldMilestone = await Milestone.findById(req.params.milestoneId);
  if (!oldMilestone) {
    return next(new AppError('Milestone not found', 404, 'MILESTONE_NOT_FOUND'));
  }

  const milestone = await Milestone.findByIdAndUpdate(req.params.milestoneId, update, {
    new: true,
    runValidators: true,
  });

  const project = await Project.findById(milestone.project);

  if (update.status === 'completed' && oldMilestone.status !== 'completed') {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: milestone.project,
      actor: req.user._id,
      action: 'milestone_completed',
      entityType: 'Milestone',
      entityId: milestone._id,
      metadata: { title: milestone.title },
    });
  }

  sendResponse(res, 200, milestone);
});

/**
 * DELETE /api/milestones/:milestoneId
 */
exports.deleteMilestone = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findByIdAndDelete(req.params.milestoneId);
  if (!milestone) {
    return next(new AppError('Milestone not found', 404, 'MILESTONE_NOT_FOUND'));
  }
  sendResponse(res, 200, { message: 'Milestone deleted successfully' });
});
