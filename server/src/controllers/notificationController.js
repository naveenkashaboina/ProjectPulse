const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, getPagination, parsePagination } = require('../utils/helpers');
const { Notification } = require('../models');

/**
 * GET /api/notifications
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  if (req.query.read === 'false') filter.read = false;
  if (req.query.read === 'true') filter.read = true;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  sendResponse(res, 200, notifications, {
    ...getPagination(page, limit, total),
    unreadCount,
  });
});

/**
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  sendResponse(res, 200, notification);
});

/**
 * PATCH /api/notifications/read-all
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );

  sendResponse(res, 200, { message: 'All notifications marked as read' });
});
