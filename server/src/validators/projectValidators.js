const { body } = require('express-validator');

const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  body('team')
    .optional()
    .isMongoId().withMessage('Team must be a valid ID'),
  body('prefix')
    .optional()
    .trim()
    .isLength({ max: 6 }).withMessage('Prefix cannot exceed 6 characters'),
];

const updateProjectValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['active', 'archived', 'on-hold']).withMessage('Invalid status'),
];

const addProjectMemberValidation = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Must be a valid user ID'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'])
    .withMessage('Invalid role'),
];

const createMilestoneValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('dueDate')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'overdue']).withMessage('Invalid status'),
];

const createSprintValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Sprint name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date'),
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed']).withMessage('Invalid status'),
];

const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 300 }).withMessage('Title must be 2-300 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('status')
    .optional()
    .isIn(['backlog', 'todo', 'in-progress', 'in-review', 'done']).withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('storyPoints')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Story points must be 0-100'),
  body('assignee')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Assignee must be a valid user ID'),
  body('sprint')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Sprint must be a valid ID'),
  body('labels')
    .optional()
    .isArray().withMessage('Labels must be an array'),
  body('labels.*')
    .optional()
    .isMongoId().withMessage('Each label must be a valid ID'),
  body('dependsOn')
    .optional()
    .isArray().withMessage('Dependencies must be an array'),
  body('dependsOn.*')
    .optional()
    .isMongoId().withMessage('Each dependency must be a valid ID'),
  body('dueDate')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || !isNaN(Date.parse(val)))
    .withMessage('Due date must be a valid date'),
  body('isBlocked')
    .optional()
    .isBoolean().withMessage('isBlocked must be a boolean'),
  body('blockReason')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

const updateTaskStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['backlog', 'todo', 'in-progress', 'in-review', 'done']).withMessage('Invalid status'),
];

const createIssueValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Issue title is required')
    .isLength({ min: 2, max: 300 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('stepsToReproduce')
    .optional()
    .trim()
    .isLength({ max: 3000 }),
  body('task')
    .optional()
    .isMongoId().withMessage('Task must be a valid ID'),
  body('assignee')
    .optional({ values: 'null' })
    .isMongoId().withMessage('Assignee must be a valid user ID'),
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 300 }).withMessage('Title must be 2-300 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('status')
    .optional()
    .isIn(['backlog', 'todo', 'in-progress', 'in-review', 'done']).withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('storyPoints')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Story points must be 0-100'),
  body('assignee')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Assignee must be a valid user ID'),
  body('sprint')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Sprint must be a valid ID'),
  body('labels')
    .optional()
    .isArray().withMessage('Labels must be an array'),
  body('dependsOn')
    .optional()
    .isArray().withMessage('Dependencies must be an array'),
  body('dueDate')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || !isNaN(Date.parse(val)))
    .withMessage('Due date must be a valid date'),
  body('isBlocked')
    .optional()
    .isBoolean().withMessage('isBlocked must be a boolean'),
  body('blockReason')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('order')
    .optional()
    .isNumeric(),
];

const updateSprintValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed']).withMessage('Invalid status'),
];

const updateMilestoneValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'overdue', 'open']).withMessage('Invalid status'),
];

const updateIssueValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 300 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('status')
    .optional()
    .isIn(['open', 'investigating', 'in-progress', 'resolved', 'closed', 'wont-fix']).withMessage('Invalid status'),
  body('stepsToReproduce')
    .optional()
    .trim()
    .isLength({ max: 3000 }),
  body('resolution')
    .optional()
    .trim()
    .isLength({ max: 2000 }),
  body('statusNote')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('task')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Task must be a valid ID'),
  body('assignee')
    .optional({ values: 'null' })
    .custom((val) => val === null || val === '' || /^[0-9a-fA-F]{24}$/.test(val))
    .withMessage('Assignee must be a valid user ID'),
];

const createCommentValidation = [
  body('body')
    .trim()
    .notEmpty().withMessage('Comment body is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Comment must be 1-5000 characters'),
];

const createLabelValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Label name is required')
    .isLength({ min: 1, max: 50 }),
  body('color')
    .notEmpty().withMessage('Color is required')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
];

const updateLabelValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Label name must be 1-50 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
];

module.exports = {
  createProjectValidation,
  updateProjectValidation,
  addProjectMemberValidation,
  createMilestoneValidation,
  updateMilestoneValidation,
  createSprintValidation,
  updateSprintValidation,
  createTaskValidation,
  updateTaskValidation,
  updateTaskStatusValidation,
  createIssueValidation,
  updateIssueValidation,
  createCommentValidation,
  createLabelValidation,
  updateLabelValidation,
};
