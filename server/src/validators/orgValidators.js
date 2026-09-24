const { body, param, query } = require('express-validator');

const createOrgValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Organization name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
];

const updateOrgValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
];

const inviteValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'])
    .withMessage('Invalid role'),
];

const createTeamValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Team name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('members')
    .optional()
    .isArray().withMessage('Members must be an array'),
  body('lead')
    .optional()
    .isMongoId().withMessage('Lead must be a valid user ID'),
];

const updateTeamValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('members')
    .optional()
    .isArray().withMessage('Members must be an array'),
  body('lead')
    .optional()
    .isMongoId().withMessage('Lead must be a valid user ID'),
];

const updateMemberRoleValidation = [
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'])
    .withMessage('Invalid role'),
];

module.exports = {
  createOrgValidation,
  updateOrgValidation,
  inviteValidation,
  updateMemberRoleValidation,
  createTeamValidation,
  updateTeamValidation,
};
