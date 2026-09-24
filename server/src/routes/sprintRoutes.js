const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { createSprintValidation, updateSprintValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const { Sprint, Project } = require('../models');

const resolveSprintProject = catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.sprintId);
  if (!sprint) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Sprint not found', 404));
  }
  req.params.projectId = sprint.project.toString();
  req.project = await Project.findById(sprint.project);
  next();
});

router.use(authenticate);

router.get('/:sprintId', resolveSprintProject, requireProjectAccess('view'), sprintController.getSprint);
router.put('/:sprintId', resolveSprintProject, requireProjectAccess('manage'), updateSprintValidation, validate, sprintController.updateSprint);
router.delete('/:sprintId', resolveSprintProject, requireProjectAccess('admin'), sprintController.deleteSprint);

module.exports = router;
