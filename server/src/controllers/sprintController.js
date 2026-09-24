const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, logActivity } = require('../utils/helpers');
const { Sprint, Task, Project, ActivityLog } = require('../models');

/**
 * POST /api/projects/:projectId/sprints
 */
exports.createSprint = catchAsync(async (req, res, next) => {
  const { name, startDate, endDate, goal, status } = req.body;
  const project = req.project;

  const sprint = await Sprint.create({
    project: req.params.projectId,
    name,
    startDate,
    endDate,
    goal,
    status: status || 'planned',
  });

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'created',
    entityType: 'Sprint',
    entityId: sprint._id,
    metadata: { sprintName: name },
  });

  sendResponse(res, 201, sprint);
});

/**
 * GET /api/projects/:projectId/sprints
 */
exports.getSprints = catchAsync(async (req, res, next) => {
  const filter = { project: req.params.projectId };
  if (req.query.status) filter.status = req.query.status;

  const sprints = await Sprint.find(filter).sort({ startDate: -1 });

  // Attach task counts for each sprint
  const sprintsWithCounts = await Promise.all(
    sprints.map(async (sprint) => {
      const taskCount = await Task.countDocuments({ sprint: sprint._id });
      const completedCount = await Task.countDocuments({ sprint: sprint._id, status: 'done' });
      const totalPoints = await Task.aggregate([
        { $match: { sprint: sprint._id } },
        { $group: { _id: null, total: { $sum: '$storyPoints' } } },
      ]);
      return {
        ...sprint.toObject(),
        taskCount,
        completedCount,
        totalStoryPoints: totalPoints[0]?.total || 0,
      };
    })
  );

  sendResponse(res, 200, sprintsWithCounts);
});

/**
 * GET /api/sprints/:sprintId
 */
exports.getSprint = catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.sprintId);
  if (!sprint) {
    return next(new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND'));
  }

  const tasks = await Task.find({ sprint: sprint._id })
    .populate('assignee', 'name email avatar')
    .populate('labels')
    .sort({ order: 1 });

  sendResponse(res, 200, { ...sprint.toObject(), tasks });
});

/**
 * PUT /api/sprints/:sprintId
 */
exports.updateSprint = catchAsync(async (req, res, next) => {
  const allowed = ['name', 'startDate', 'endDate', 'goal', 'status'];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  const oldSprint = await Sprint.findById(req.params.sprintId);
  if (!oldSprint) {
    return next(new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND'));
  }

  const sprint = await Sprint.findByIdAndUpdate(req.params.sprintId, update, {
    new: true,
    runValidators: true,
  });

  const project = await Project.findById(sprint.project);

  // Log sprint start/complete
  if (update.status === 'active' && oldSprint.status !== 'active') {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: sprint.project,
      actor: req.user._id,
      action: 'sprint_started',
      entityType: 'Sprint',
      entityId: sprint._id,
      metadata: { sprintName: sprint.name },
    });
  } else if (update.status === 'completed' && oldSprint.status !== 'completed') {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: sprint.project,
      actor: req.user._id,
      action: 'sprint_completed',
      entityType: 'Sprint',
      entityId: sprint._id,
      metadata: { sprintName: sprint.name },
    });
  }

  sendResponse(res, 200, sprint);
});

/**
 * DELETE /api/sprints/:sprintId
 */
exports.deleteSprint = catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.sprintId);
  if (!sprint) {
    return next(new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND'));
  }

  // Move tasks back to backlog
  await Task.updateMany({ sprint: sprint._id }, { sprint: null });

  await Sprint.findByIdAndDelete(sprint._id);

  sendResponse(res, 200, { message: 'Sprint deleted. Tasks moved to backlog.' });
});
