const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { createMilestoneValidation, updateMilestoneValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const { Milestone, Project } = require('../models');

const resolveMilestoneProject = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.milestoneId);
  if (!milestone) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Milestone not found', 404));
  }
  req.params.projectId = milestone.project.toString();
  req.project = await Project.findById(milestone.project);
  next();
});

router.use(authenticate);

router.get('/:milestoneId', resolveMilestoneProject, requireProjectAccess('view'), milestoneController.getMilestone);
router.put('/:milestoneId', resolveMilestoneProject, requireProjectAccess('manage'), updateMilestoneValidation, validate, milestoneController.updateMilestone);
router.delete('/:milestoneId', resolveMilestoneProject, requireProjectAccess('admin'), milestoneController.deleteMilestone);

module.exports = router;
