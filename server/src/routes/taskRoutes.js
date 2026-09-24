const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const attachmentController = require('../controllers/attachmentController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { updateTaskStatusValidation, createTaskValidation, updateTaskValidation, createCommentValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const { Task, Project } = require('../models');

// Middleware to resolve task's project and check access
const resolveTaskProject = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Task not found', 404));
  }
  req.params.projectId = task.project.toString();
  req.task = task;
  req.project = await Project.findById(task.project);
  next();
});

router.use(authenticate);

// Task detail routes
router.get('/:taskId', resolveTaskProject, requireProjectAccess('view'), taskController.getTask);
router.put('/:taskId', resolveTaskProject, requireProjectAccess('edit'), updateTaskValidation, validate, taskController.updateTask);
router.patch('/:taskId/status', resolveTaskProject, requireProjectAccess('edit'), updateTaskStatusValidation, validate, taskController.updateTaskStatus);
router.delete('/:taskId', resolveTaskProject, requireProjectAccess('admin'), taskController.deleteTask);

// Comments on tasks
router.get('/:taskId/comments', resolveTaskProject, requireProjectAccess('view'), commentController.getComments);
router.post('/:taskId/comments', resolveTaskProject, requireProjectAccess('comment'), createCommentValidation, validate, commentController.createComment);

// Attachments on tasks
router.get('/:taskId/attachments', resolveTaskProject, requireProjectAccess('view'), attachmentController.getAttachments);
router.post('/:taskId/attachments', resolveTaskProject, requireProjectAccess('edit'), attachmentController.uploadMiddleware, attachmentController.createAttachment);

module.exports = router;
