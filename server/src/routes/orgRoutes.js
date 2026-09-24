const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const teamController = require('../controllers/teamController');
const projectController = require('../controllers/projectController');
const { authenticate, requireRole, requireOrgMember } = require('../middleware/auth');
const { inviteLimiter } = require('../middleware/rateLimiter');
const { createOrgValidation, updateOrgValidation, inviteValidation, updateMemberRoleValidation, createTeamValidation, updateTeamValidation } = require('../validators/orgValidators');
const { createProjectValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');

// All org routes require authentication
router.use(authenticate);

// Organizations
router.post('/', createOrgValidation, validate, orgController.createOrganization);
router.get('/:orgId', requireOrgMember, orgController.getOrganization);
router.put('/:orgId', requireRole('OrgAdmin'), updateOrgValidation, validate, orgController.updateOrganization);

// Members
router.get('/:orgId/members', requireOrgMember, orgController.getMembers);
router.post('/:orgId/invitations', inviteLimiter, requireRole('OrgAdmin'), inviteValidation, validate, orgController.inviteMember);
router.put('/:orgId/members/:userId/role', requireRole('OrgAdmin'), updateMemberRoleValidation, validate, orgController.updateMemberRole);
router.delete('/:orgId/members/:userId', requireRole('OrgAdmin'), orgController.removeMember);

// Teams (nested under org)
router.post('/:orgId/teams', requireRole('OrgAdmin', 'ProjectManager'), createTeamValidation, validate, teamController.createTeam);
router.get('/:orgId/teams', requireOrgMember, teamController.getTeams);

// Projects (nested under org)
router.post('/:orgId/projects', requireRole('OrgAdmin', 'ProjectManager'), createProjectValidation, validate, projectController.createProject);
router.get('/:orgId/projects', requireOrgMember, projectController.getProjects);

module.exports = router;
