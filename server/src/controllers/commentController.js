const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, getPagination, parsePagination, logActivity, createNotification, escapeRegex } = require('../utils/helpers');
const { Comment, Task, Issue, Project, ActivityLog, Notification, User } = require('../models');

/**
 * POST /api/tasks/:taskId/comments  OR  /api/issues/:issueId/comments
 */
exports.createComment = catchAsync(async (req, res, next) => {
  const { body: commentBody } = req.body;
  
  let parentType, parentId, parentDoc;
  if (req.params.taskId) {
    parentType = 'Task';
    parentId = req.params.taskId;
    parentDoc = await Task.findById(parentId);
  } else if (req.params.issueId) {
    parentType = 'Issue';
    parentId = req.params.issueId;
    parentDoc = await Issue.findById(parentId);
  }

  if (!parentDoc) {
    return next(new AppError(`${parentType} not found`, 404));
  }

  // Parse @mentions securely
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
  const mentionNames = [];
  let match;
  while ((match = mentionRegex.exec(commentBody)) !== null) {
    const rawName = match[1].toLowerCase().slice(0, 50);
    mentionNames.push(rawName);
  }

  let mentionIds = [];
  if (mentionNames.length > 0) {
    const mentionedUsers = await User.find({
      $or: mentionNames.map(name => {
        const escaped = escapeRegex(name);
        return {
          $or: [
            { email: new RegExp(`^${escaped}`, 'i') },
            { name: new RegExp(escaped, 'i') },
          ],
        };
      }),
    });
    mentionIds = mentionedUsers.map(u => u._id);

    // Send notifications to mentioned users
    for (const user of mentionedUsers) {
      if (user._id.toString() !== req.user._id.toString()) {
        await createNotification(Notification, {
          user: user._id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.name} mentioned you in a comment`,
          payload: { parentType, parentId, commentBody: commentBody.substring(0, 100) },
          link: parentType === 'Task' ? `/tasks/${parentId}` : `/issues/${parentId}`,
        });
      }
    }
  }

  const comment = await Comment.create({
    parentType,
    parentId,
    author: req.user._id,
    body: commentBody,
    mentions: mentionIds,
  });

  const project = await Project.findById(parentDoc.project);

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'comment_added',
    entityType: parentType,
    entityId: parentId,
    metadata: { commentId: comment._id, preview: commentBody.substring(0, 80) },
  });

  const populated = await comment.populate('author', 'name email avatar');
  sendResponse(res, 201, populated);
});

/**
 * GET /api/tasks/:taskId/comments  OR  /api/issues/:issueId/comments
 */
exports.getComments = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);
  let parentType, parentId;

  if (req.params.taskId) {
    parentType = 'Task';
    parentId = req.params.taskId;
  } else if (req.params.issueId) {
    parentType = 'Issue';
    parentId = req.params.issueId;
  }

  const filter = { parentType, parentId };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments(filter),
  ]);

  sendResponse(res, 200, comments, getPagination(page, limit, total));
});

/**
 * PUT /api/comments/:commentId
 */
exports.updateComment = catchAsync(async (req, res, next) => {
  const comment = req.comment || await Comment.findById(req.params.commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND'));
  }

  // Only author can edit
  if (comment.author.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own comments', 403, 'NOT_COMMENT_AUTHOR'));
  }

  comment.body = req.body.body;
  comment.editedAt = new Date();
  await comment.save();

  const populated = await comment.populate('author', 'name email avatar');
  sendResponse(res, 200, populated);
});

/**
 * DELETE /api/comments/:commentId
 */
exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = req.comment || await Comment.findById(req.params.commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND'));
  }

  // Author or PM/OrgAdmin can delete
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const canModerate = ['OrgAdmin', 'ProjectManager'].includes(req.projectRole);

  if (!isAuthor && !canModerate) {
    return next(new AppError('You do not have permission to delete this comment', 403, 'FORBIDDEN'));
  }

  await Comment.findByIdAndDelete(comment._id);
  sendResponse(res, 200, { message: 'Comment deleted successfully' });
});
