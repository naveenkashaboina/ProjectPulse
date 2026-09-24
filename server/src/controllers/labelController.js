const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/helpers');
const { Label } = require('../models');

/**
 * POST /api/projects/:projectId/labels
 */
exports.createLabel = catchAsync(async (req, res, next) => {
  const { name, color } = req.body;
  const label = await Label.create({
    project: req.params.projectId,
    name,
    color,
  });
  sendResponse(res, 201, label);
});

/**
 * GET /api/projects/:projectId/labels
 */
exports.getLabels = catchAsync(async (req, res, next) => {
  const labels = await Label.find({ project: req.params.projectId }).sort({ name: 1 });
  sendResponse(res, 200, labels);
});

/**
 * PUT /api/labels/:labelId
 */
exports.updateLabel = catchAsync(async (req, res, next) => {
  const { name, color } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (color !== undefined) update.color = color;

  const label = await Label.findByIdAndUpdate(req.params.labelId, update, {
    new: true,
    runValidators: true,
  });

  if (!label) {
    return next(new AppError('Label not found', 404));
  }

  sendResponse(res, 200, label);
});

/**
 * DELETE /api/labels/:labelId
 */
exports.deleteLabel = catchAsync(async (req, res, next) => {
  const label = await Label.findByIdAndDelete(req.params.labelId);
  if (!label) {
    return next(new AppError('Label not found', 404));
  }
  sendResponse(res, 200, { message: 'Label deleted' });
});
