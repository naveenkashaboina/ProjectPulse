const catchAsync = require('../utils/catchAsync');
const { sendResponse, getPagination, parsePagination } = require('../utils/helpers');
const { ActivityLog } = require('../models');

/**
 * GET /api/projects/:projectId/activity
 */
exports.getProjectActivity = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { project: req.params.projectId };

  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.action) filter.action = req.query.action;

  const [activities, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  sendResponse(res, 200, activities, getPagination(page, limit, total));
});
