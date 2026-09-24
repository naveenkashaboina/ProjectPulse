const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, getPagination, parsePagination, logActivity, createNotification } = require('../utils/helpers');
const { Task, ActivityLog, Notification, Project } = require('../models');

/**
 * POST /api/projects/:projectId/tasks
 */
exports.createTask = catchAsync(async (req, res, next) => {
  const { title, description, status, priority, storyPoints, assignee, sprint, labels, dependsOn, dueDate, isBlocked, blockReason } = req.body;
  const project = req.project;

  const task = await Task.create({
    project: req.params.projectId,
    title,
    description,
    status: status || 'backlog',
    priority: priority || 'medium',
    storyPoints: storyPoints || 0,
    assignee,
    sprint,
    labels: labels || [],
    dependsOn: dependsOn || [],
    dueDate,
    isBlocked: isBlocked || false,
    blockReason,
    createdBy: req.user._id,
  });

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'created',
    entityType: 'Task',
    entityId: task._id,
    metadata: { taskTitle: title, status: task.status },
  });

  if (assignee && assignee.toString() !== req.user._id.toString()) {
    await createNotification(Notification, {
      user: assignee,
      type: 'assignment',
      title: 'New Task Assignment',
      message: `You've been assigned to "${title}"`,
      payload: { taskId: task._id, projectId: project._id },
      link: `/tasks/${task._id}`,
    });
  }

  const populated = await task.populate([
    { path: 'assignee', select: 'name email avatar' },
    { path: 'labels' },
  ]);

  sendResponse(res, 201, populated);
});

/**
 * GET /api/projects/:projectId/tasks
 */
exports.getTasks = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { project: req.params.projectId };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignee) filter.assignee = req.query.assignee;
  if (req.query.sprint) filter.sprint = req.query.sprint;
  if (req.query.sprint === 'null') filter.sprint = null;
  if (req.query.isBlocked === 'true') filter.isBlocked = true;
  if (req.query.label) filter.labels = { $in: [req.query.label] };

  const sortField = req.query.sort || '-createdAt';

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('labels')
      .populate('sprint', 'name status')
      .sort(sortField)
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  sendResponse(res, 200, tasks, getPagination(page, limit, total));
});

/**
 * GET /api/tasks/:taskId
 */
exports.getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId)
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('labels')
    .populate('sprint', 'name status startDate endDate')
    .populate('dependsOn', 'title status');

  if (!task) {
    return next(new AppError('Task not found', 404, 'TASK_NOT_FOUND'));
  }

  sendResponse(res, 200, task);
});

/**
 * PUT /api/tasks/:taskId
 */
exports.updateTask = catchAsync(async (req, res, next) => {
  const allowed = ['title', 'description', 'status', 'priority', 'storyPoints', 'assignee', 'sprint', 'labels', 'dependsOn', 'dueDate', 'isBlocked', 'blockReason', 'order'];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  const oldTask = await Task.findById(req.params.taskId);
  if (!oldTask) {
    return next(new AppError('Task not found', 404, 'TASK_NOT_FOUND'));
  }

  const task = await Task.findByIdAndUpdate(req.params.taskId, update, {
    new: true,
    runValidators: true,
  })
    .populate('assignee', 'name email avatar')
    .populate('labels')
    .populate('sprint', 'name status');

  const project = await Project.findById(task.project);

  // Log status change specifically
  if (update.status && update.status !== oldTask.status) {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: task.project,
      actor: req.user._id,
      action: 'status_changed',
      entityType: 'Task',
      entityId: task._id,
      metadata: { from: oldTask.status, to: update.status, taskTitle: task.title },
    });
  } else {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: task.project,
      actor: req.user._id,
      action: 'updated',
      entityType: 'Task',
      entityId: task._id,
      metadata: { changes: Object.keys(update), taskTitle: task.title },
    });
  }

  // Notify new assignee
  if (update.assignee && update.assignee.toString() !== oldTask.assignee?.toString() && update.assignee.toString() !== req.user._id.toString()) {
    await createNotification(Notification, {
      user: update.assignee,
      type: 'assignment',
      title: 'Task Reassigned',
      message: `You've been assigned to "${task.title}"`,
      payload: { taskId: task._id, projectId: task.project },
      link: `/tasks/${task._id}`,
    });
  }

  // Handle blocker notifications
  if (update.isBlocked && !oldTask.isBlocked) {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: task.project,
      actor: req.user._id,
      action: 'blocker_added',
      entityType: 'Task',
      entityId: task._id,
      metadata: { reason: update.blockReason, taskTitle: task.title },
    });
  } else if (update.isBlocked === false && oldTask.isBlocked) {
    await logActivity(ActivityLog, {
      organization: project.organization,
      project: task.project,
      actor: req.user._id,
      action: 'blocker_removed',
      entityType: 'Task',
      entityId: task._id,
      metadata: { taskTitle: task.title },
    });
  }

  sendResponse(res, 200, task);
});

/**
 * PATCH /api/tasks/:taskId/status
 */
exports.updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const task = await Task.findById(req.params.taskId);
  if (!task) {
    return next(new AppError('Task not found', 404, 'TASK_NOT_FOUND'));
  }

  const oldStatus = task.status;
  task.status = status;
  await task.save();

  const project = await Project.findById(task.project);

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: task.project,
    actor: req.user._id,
    action: 'status_changed',
    entityType: 'Task',
    entityId: task._id,
    metadata: { from: oldStatus, to: status, taskTitle: task.title },
  });

  // Notify assignee of status change
  if (task.assignee && task.assignee.toString() !== req.user._id.toString()) {
    await createNotification(Notification, {
      user: task.assignee,
      type: 'status_change',
      title: 'Task Status Updated',
      message: `"${task.title}" moved from ${oldStatus} to ${status}`,
      payload: { taskId: task._id, from: oldStatus, to: status },
      link: `/tasks/${task._id}`,
    });
  }

  const populated = await task.populate([
    { path: 'assignee', select: 'name email avatar' },
    { path: 'labels' },
  ]);

  sendResponse(res, 200, populated);
});

/**
 * DELETE /api/tasks/:taskId
 */
exports.deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.taskId);
  if (!task) {
    return next(new AppError('Task not found', 404, 'TASK_NOT_FOUND'));
  }

  const project = await Project.findById(task.project);

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: task.project,
    actor: req.user._id,
    action: 'deleted',
    entityType: 'Task',
    entityId: task._id,
    metadata: { taskTitle: task.title },
  });

  sendResponse(res, 200, { message: 'Task deleted successfully' });
});
