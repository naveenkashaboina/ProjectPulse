const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, getPagination, parsePagination, logActivity, escapeRegex } = require('../utils/helpers');
const { Project, ProjectMembership, OrgMembership, ActivityLog, Task, Sprint, Milestone, Issue } = require('../models');

/**
 * POST /api/organizations/:orgId/projects
 */
exports.createProject = catchAsync(async (req, res, next) => {
  const { name, description, startDate, endDate, team, prefix } = req.body;

  const project = await Project.create({
    organization: req.params.orgId,
    name,
    description,
    startDate,
    endDate,
    team,
    prefix,
    createdBy: req.user._id,
  });

  // Add creator as ProjectManager
  await ProjectMembership.create({
    user: req.user._id,
    project: project._id,
    role: 'ProjectManager',
  });

  await logActivity(ActivityLog, {
    organization: req.params.orgId,
    project: project._id,
    actor: req.user._id,
    action: 'created',
    entityType: 'Project',
    entityId: project._id,
    metadata: { projectName: name },
  });

  sendResponse(res, 201, project);
});

/**
 * GET /api/organizations/:orgId/projects
 */
exports.getProjects = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organization: req.params.orgId };

  if (req.query.status) filter.status = req.query.status;

  // OrgAdmins see all, others see only their projects
  if (req.orgMembership.role !== 'OrgAdmin') {
    const memberships = await ProjectMembership.find({ user: req.user._id }).select('project');
    const projectIds = memberships.map((m) => m.project);
    filter._id = { $in: projectIds };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('team', 'name')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter),
  ]);

  sendResponse(res, 200, projects, getPagination(page, limit, total));
});

/**
 * GET /api/projects/:projectId
 */
exports.getProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId)
    .populate('team', 'name members lead')
    .populate('createdBy', 'name email avatar');

  if (!project) {
    return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  }

  // Get project members
  const members = await ProjectMembership.find({ project: project._id })
    .populate('user', 'name email avatar');

  sendResponse(res, 200, { ...project.toObject(), members });
});

/**
 * PUT /api/projects/:projectId
 */
exports.updateProject = catchAsync(async (req, res, next) => {
  const allowed = ['name', 'description', 'startDate', 'endDate', 'status', 'team', 'prefix'];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  });

  const project = await Project.findByIdAndUpdate(req.params.projectId, update, {
    new: true,
    runValidators: true,
  });

  if (!project) {
    return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  }

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'updated',
    entityType: 'Project',
    entityId: project._id,
    metadata: { changes: Object.keys(update) },
  });

  sendResponse(res, 200, project);
});

/**
 * DELETE /api/projects/:projectId (archive)
 */
exports.deleteProject = catchAsync(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    { status: 'archived' },
    { new: true }
  );

  if (!project) {
    return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  }

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'archived',
    entityType: 'Project',
    entityId: project._id,
    metadata: { projectName: project.name },
  });

  sendResponse(res, 200, { message: 'Project archived successfully' });
});

/**
 * POST /api/projects/:projectId/members
 */
exports.addProjectMember = catchAsync(async (req, res, next) => {
  const { userId, role } = req.body;
  const projectId = req.params.projectId;
  const project = req.project;

  // Verify user is an org member
  const orgMembership = await OrgMembership.findOne({
    user: userId,
    organization: project.organization,
    status: 'active',
  });

  if (!orgMembership) {
    return next(new AppError('User must be an organization member first', 400, 'NOT_ORG_MEMBER'));
  }

  const membership = await ProjectMembership.findOneAndUpdate(
    { user: userId, project: projectId },
    { user: userId, project: projectId, role },
    { upsert: true, new: true }
  );

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: projectId,
    actor: req.user._id,
    action: 'member_added',
    entityType: 'Member',
    entityId: userId,
    metadata: { role },
  });

  const populated = await membership.populate('user', 'name email avatar');
  sendResponse(res, 201, populated);
});

/**
 * GET /api/projects/:projectId/members
 */
exports.getProjectMembers = catchAsync(async (req, res, next) => {
  const members = await ProjectMembership.find({ project: req.params.projectId })
    .populate('user', 'name email avatar');

  sendResponse(res, 200, members);
});

/**
 * DELETE /api/projects/:projectId/members/:userId
 */
exports.removeProjectMember = catchAsync(async (req, res, next) => {
  await ProjectMembership.findOneAndDelete({
    user: req.params.userId,
    project: req.params.projectId,
  });

  sendResponse(res, 200, { message: 'Member removed from project' });
});

/**
 * GET /api/projects/:projectId/workload
 */
exports.getWorkload = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  const sprintId = req.query.sprint;

  const match = { project: projectId, status: { $ne: 'done' } };
  if (sprintId) match.sprint = sprintId;

  // Ensure projectId is a proper ObjectId for aggregation
  const mongoose = require('mongoose');
  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const aggMatch = { project: projectObjectId, status: { $ne: 'done' } };
  if (sprintId) aggMatch.sprint = new mongoose.Types.ObjectId(sprintId);

  const workload = await Task.aggregate([
    { $match: aggMatch },
    {
      $group: {
        _id: '$assignee',
        taskCount: { $sum: 1 },
        totalStoryPoints: { $sum: '$storyPoints' },
        byStatus: {
          $push: { status: '$status', storyPoints: '$storyPoints' },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'assignee',
      },
    },
    { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        assignee: {
          $cond: [
            { $ifNull: ['$assignee._id', false] },
            {
              _id: '$assignee._id',
              name: '$assignee.name',
              email: '$assignee.email',
              avatar: '$assignee.avatar',
            },
            null,
          ],
        },
        taskCount: 1,
        totalStoryPoints: 1,
        byStatus: 1,
      },
    },
    { $sort: { totalStoryPoints: -1 } },
  ]);

  sendResponse(res, 200, workload);
});

/**
 * GET /api/projects/:projectId/reports/summary
 */
exports.getReportSummary = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  const mongoose = require('mongoose');
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  const [taskStats, issueStats, sprintData, milestoneData] = await Promise.all([
    // Task statistics
    Task.aggregate([
      { $match: { project: projectObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$storyPoints' },
        },
      },
    ]),
    // Issue statistics
    Issue.aggregate([
      { $match: { project: projectObjectId } },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]),
    // Sprint data
    Sprint.find({ project: projectId }).sort({ startDate: 1 }),
    // Milestone data
    Milestone.find({ project: projectId }).sort({ dueDate: 1 }),
  ]);

  // Calculate totals
  const totalTasks = taskStats.reduce((acc, s) => acc + s.count, 0);
  const completedTasks = taskStats.find((s) => s._id === 'done')?.count || 0;
  const overdueTasks = await Task.countDocuments({
    project: projectId,
    dueDate: { $lt: new Date() },
    status: { $ne: 'done' },
  });

  // Priority breakdown
  const priorityStats = await Task.aggregate([
    { $match: { project: projectObjectId } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  // Burndown data for active sprint
  const activeSprint = sprintData.find((s) => s.status === 'active');
  let burndownData = [];
  if (activeSprint) {
    const sprintTasks = await Task.find({ project: projectId, sprint: activeSprint._id });
    burndownData = {
      sprintName: activeSprint.name,
      totalTasks: sprintTasks.length,
      totalPoints: sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0),
      completedTasks: sprintTasks.filter((t) => t.status === 'done').length,
      completedPoints: sprintTasks.filter((t) => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0),
    };
  }

  sendResponse(res, 200, {
    tasks: {
      total: totalTasks,
      totalPoints: taskStats.reduce((acc, s) => acc + (s.totalPoints || 0), 0),
      completed: completedTasks,
      completionPercentage: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      overdue: overdueTasks,
      byStatus: taskStats,
      byPriority: priorityStats,
    },
    issues: {
      total: issueStats.reduce((acc, s) => acc + s.count, 0),
      bySeverity: issueStats,
    },
    sprints: {
      total: sprintData.length,
      active: sprintData.filter((s) => s.status === 'active').length,
      completed: sprintData.filter((s) => s.status === 'completed').length,
    },
    milestones: {
      total: milestoneData.length,
      completed: milestoneData.filter((m) => m.status === 'completed').length,
      overdue: milestoneData.filter((m) => m.dueDate < new Date() && m.status !== 'completed').length,
    },
    burndown: burndownData,
  });
});

/**
 * GET /api/projects/:projectId/search
 */
exports.searchProject = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const projectId = req.params.projectId;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return sendResponse(res, 200, { tasks: [], issues: [] });
  }

  // Bound maximum search input length to 100 characters and escape regex special characters to prevent ReDoS
  const cleanQ = q.trim().slice(0, 100);
  const searchRegex = new RegExp(escapeRegex(cleanQ), 'i');

  const [tasks, issues] = await Promise.all([
    Task.find({
      project: projectId,
      $or: [{ title: searchRegex }, { description: searchRegex }],
    })
      .populate('assignee', 'name email avatar')
      .limit(20),
    Issue.find({
      project: projectId,
      $or: [{ title: searchRegex }, { description: searchRegex }],
    })
      .populate('assignee', 'name email avatar')
      .limit(20),
  ]);

  sendResponse(res, 200, { tasks, issues });
});
