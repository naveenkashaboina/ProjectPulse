const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, requireOrgMember, requireRole } = require('../middleware/auth');
const { updateTeamValidation } = require('../validators/orgValidators');
const validate = require('../middleware/validate');
const catchAsync = require('../utils/catchAsync');
const { Team } = require('../models');

const resolveTeamOrg = catchAsync(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);
  if (!team) {
    const AppError = require('../utils/AppError');
    return next(new AppError('Team not found', 404));
  }
  req.params.orgId = team.organization.toString();
  next();
});

router.use(authenticate);

router.get('/:teamId', resolveTeamOrg, requireOrgMember, teamController.getTeam);
router.put('/:teamId', resolveTeamOrg, requireRole('OrgAdmin', 'ProjectManager'), updateTeamValidation, validate, teamController.updateTeam);
router.delete('/:teamId', resolveTeamOrg, requireRole('OrgAdmin'), teamController.deleteTeam);

module.exports = router;
