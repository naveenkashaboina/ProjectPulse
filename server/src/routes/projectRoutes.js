const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const milestoneController = require('../controllers/milestoneController');
const sprintController = require('../controllers/sprintController');
const taskController = require('../controllers/taskController');
const issueController = require('../controllers/issueController');
const labelController = require('../controllers/labelController');
const activityController = require('../controllers/activityController');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { updateProjectValidation, addProjectMemberValidation, createMilestoneValidation, createSprintValidation, createTaskValidation, createIssueValidation, createLabelValidation } = require('../validators/projectValidators');
const validate = require('../middleware/validate');

router.use(authenticate);

// Project CRUD
router.get('/:projectId', requireProjectAccess('view'), projectController.getProject);
router.put('/:projectId', requireProjectAccess('admin'), updateProjectValidation, validate, projectController.updateProject);
router.delete('/:projectId', requireProjectAccess('admin'), projectController.deleteProject);

// Project Members
router.get('/:projectId/members', requireProjectAccess('view'), projectController.getProjectMembers);
router.post('/:projectId/members', requireProjectAccess('admin'), addProjectMemberValidation, validate, projectController.addProjectMember);
router.delete('/:projectId/members/:userId', requireProjectAccess('admin'), projectController.removeProjectMember);

// Milestones
router.get('/:projectId/milestones', requireProjectAccess('view'), milestoneController.getMilestones);
router.post('/:projectId/milestones', requireProjectAccess('admin'), createMilestoneValidation, validate, milestoneController.createMilestone);

// Sprints
router.get('/:projectId/sprints', requireProjectAccess('view'), sprintController.getSprints);
router.post('/:projectId/sprints', requireProjectAccess('admin'), createSprintValidation, validate, sprintController.createSprint);

// Tasks
router.get('/:projectId/tasks', requireProjectAccess('view'), taskController.getTasks);
router.post('/:projectId/tasks', requireProjectAccess('edit'), createTaskValidation, validate, taskController.createTask);

// Issues
router.get('/:projectId/issues', requireProjectAccess('view'), issueController.getIssues);
router.post('/:projectId/issues', requireProjectAccess('edit'), createIssueValidation, validate, issueController.createIssue);

// Labels
router.get('/:projectId/labels', requireProjectAccess('view'), labelController.getLabels);
router.post('/:projectId/labels', requireProjectAccess('admin'), createLabelValidation, validate, labelController.createLabel);

// Workload
router.get('/:projectId/workload', requireProjectAccess('manage'), projectController.getWorkload);

// Activity
router.get('/:projectId/activity', requireProjectAccess('view'), activityController.getProjectActivity);

// Reports
router.get('/:projectId/reports/summary', requireProjectAccess('view'), projectController.getReportSummary);

// Search
router.get('/:projectId/search', requireProjectAccess('view'), projectController.searchProject);

module.exports = router;
