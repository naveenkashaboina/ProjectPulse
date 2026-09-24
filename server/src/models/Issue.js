const mongoose = require('mongoose');

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ISSUE_STATUSES = ['open', 'investigating', 'in-progress', 'resolved', 'closed', 'wont-fix'];

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    severity: {
      type: String,
      enum: {
        values: SEVERITIES,
        message: 'Severity must be one of: ' + SEVERITIES.join(', '),
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ISSUE_STATUSES,
        message: 'Status must be one of: ' + ISSUE_STATUSES.join(', '),
      },
      default: 'open',
    },
    stepsToReproduce: {
      type: String,
      maxlength: [3000, 'Steps to reproduce cannot exceed 3000 characters'],
      default: '',
    },
    resolution: {
      type: String,
      maxlength: [2000, 'Resolution cannot exceed 2000 characters'],
      default: '',
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    statusHistory: [statusHistoryEntrySchema],
  },
  { timestamps: true }
);

issueSchema.index({ project: 1, severity: 1 });
issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ assignee: 1 });
issueSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 5 } }
);

issueSchema.statics.SEVERITIES = SEVERITIES;
issueSchema.statics.STATUSES = ISSUE_STATUSES;

module.exports = mongoose.model('Issue', issueSchema);
