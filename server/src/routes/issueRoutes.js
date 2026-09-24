const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const commentController = require('../controllers/commentController');
const attachmentController = require('../controllers/attachmentController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { createIssueValidation, updateIssueValidation, createCommentValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const { Issue, Project } = require('../models');

const resolveIssueProject = catchAsync(async (req, res, next) => {
  const issue = await Issue.findById(req.params.issueId);
  if (!issue) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Issue not found', 404));
  }
  req.params.projectId = issue.project.toString();
  req.project = await Project.findById(issue.project);
  next();
});

router.use(authenticate);

router.get('/:issueId', resolveIssueProject, requireProjectAccess('view'), issueController.getIssue);
router.put('/:issueId', resolveIssueProject, requireProjectAccess('edit'), updateIssueValidation, validate, issueController.updateIssue);
router.delete('/:issueId', resolveIssueProject, requireProjectAccess('admin'), issueController.deleteIssue);

// Comments on issues
router.get('/:issueId/comments', resolveIssueProject, requireProjectAccess('view'), commentController.getComments);
router.post('/:issueId/comments', resolveIssueProject, requireProjectAccess('comment'), createCommentValidation, validate, commentController.createComment);

// Attachments on issues
router.get('/:issueId/attachments', resolveIssueProject, requireProjectAccess('view'), attachmentController.getAttachments);
router.post('/:issueId/attachments', resolveIssueProject, requireProjectAccess('edit'), attachmentController.uploadMiddleware, attachmentController.createAttachment);

module.exports = router;
