const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, getPagination, parsePagination, logActivity, createNotification } = require('../utils/helpers');
const { Issue, Project, ActivityLog, Notification } = require('../models');

/**
 * POST /api/projects/:projectId/issues
 */
exports.createIssue = catchAsync(async (req, res, next) => {
  const { title, description, severity, stepsToReproduce, task, assignee } = req.body;
  const project = req.project;

  const issue = await Issue.create({
    project: req.params.projectId,
    title,
    description,
    severity: severity || 'medium',
    stepsToReproduce,
    task,
    assignee,
    reportedBy: req.user._id,
    statusHistory: [{ status: 'open', changedBy: req.user._id }],
  });

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'issue_reported',
    entityType: 'Issue',
    entityId: issue._id,
    metadata: { title, severity: issue.severity },
  });

  if (assignee && assignee.toString() !== req.user._id.toString()) {
    await createNotification(Notification, {
      user: assignee,
      type: 'assignment',
      title: 'New Issue Assigned',
      message: `Issue "${title}" has been assigned to you`,
      payload: { issueId: issue._id, projectId: project._id },
      link: `/projects/${project._id}/issues/${issue._id}`,
    });
  }

  const populated = await issue.populate([
    { path: 'assignee', select: 'name email avatar' },
    { path: 'reportedBy', select: 'name email avatar' },
  ]);

  sendResponse(res, 201, populated);
});

/**
 * GET /api/projects/:projectId/issues
 */
exports.getIssues = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { project: req.params.projectId };

  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignee) filter.assignee = req.query.assignee;

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('reportedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Issue.countDocuments(filter),
  ]);

  sendResponse(res, 200, issues, getPagination(page, limit, total));
});

/**
 * GET /api/issues/:issueId
 */
exports.getIssue = catchAsync(async (req, res, next) => {
  const issue = await Issue.findById(req.params.issueId)
    .populate('assignee', 'name email avatar')
    .populate('reportedBy', 'name email avatar')
    .populate('task', 'title status')
    .populate('statusHistory.changedBy', 'name email avatar');

  if (!issue) {
    return next(new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND'));
  }

  sendResponse(res, 200, issue);
});

/**
 * PUT /api/issues/:issueId
 */
exports.updateIssue = catchAsync(async (req, res, next) => {
  const allowed = ['title', 'description', 'severity', 'stepsToReproduce', 'assignee', 'status', 'resolution'];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  const issue = await Issue.findById(req.params.issueId);
  if (!issue) {
    return next(new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND'));
  }

  // Track status change
  if (update.status && update.status !== issue.status) {
    update.$push = {
      statusHistory: {
        status: update.status,
        changedBy: req.user._id,
        note: req.body.statusNote || '',
      },
    };

    const project = await Project.findById(issue.project);

    if (update.status === 'resolved' || update.status === 'closed') {
      await logActivity(ActivityLog, {
        organization: project.organization,
        project: issue.project,
        actor: req.user._id,
        action: 'issue_resolved',
        entityType: 'Issue',
        entityId: issue._id,
        metadata: { title: issue.title, resolution: update.resolution },
      });
    }
  }

  const updated = await Issue.findByIdAndUpdate(req.params.issueId, update, {
    new: true,
    runValidators: true,
  })
    .populate('assignee', 'name email avatar')
    .populate('reportedBy', 'name email avatar');

  sendResponse(res, 200, updated);
});

/**
 * DELETE /api/issues/:issueId
 */
exports.deleteIssue = catchAsync(async (req, res, next) => {
  const issue = await Issue.findByIdAndDelete(req.params.issueId);
  if (!issue) {
    return next(new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND'));
  }
  sendResponse(res, 200, { message: 'Issue deleted successfully' });
});
