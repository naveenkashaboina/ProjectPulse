const express = require('express');
const router = express.Router();
const labelController = require('../controllers/labelController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { updateLabelValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { Label } = require('../models');

// Resolve the label's project to enforce RBAC
const resolveLabelProject = catchAsync(async (req, res, next) => {
  const label = await Label.findById(req.params.labelId);
  if (!label) {
    return next(new AppError('Label not found', 404, 'LABEL_NOT_FOUND'));
  }
  req.params.projectId = label.project.toString();
  req.label = label;
  next();
});

router.use(authenticate);

router.put('/:labelId', resolveLabelProject, requireProjectAccess('admin'), updateLabelValidation, validate, labelController.updateLabel);
router.delete('/:labelId', resolveLabelProject, requireProjectAccess('admin'), labelController.deleteLabel);

module.exports = router;
