const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { createCommentValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { Comment, Task, Issue } = require('../models');

// Resolve the comment's parent project to enforce RBAC and authorization
const resolveCommentProject = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND'));
  }

  let parentDoc;
  if (comment.parentType === 'Task') {
    parentDoc = await Task.findById(comment.parentId);
  } else if (comment.parentType === 'Issue') {
    parentDoc = await Issue.findById(comment.parentId);
  }

  if (!parentDoc) {
    return next(new AppError('Parent entity not found', 404, 'PARENT_NOT_FOUND'));
  }

  req.params.projectId = parentDoc.project.toString();
  req.comment = comment;
  next();
});

router.use(authenticate);

router.put('/:commentId', resolveCommentProject, requireProjectAccess('comment'), createCommentValidation, validate, commentController.updateComment);
router.delete('/:commentId', resolveCommentProject, requireProjectAccess('comment'), commentController.deleteComment);

module.exports = router;
