const mongoose = require('mongoose');

const STATUSES = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: ' + STATUSES.join(', '),
      },
      default: 'backlog',
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITIES,
        message: 'Priority must be one of: ' + PRIORITIES.join(', '),
      },
      default: 'medium',
    },
    storyPoints: {
      type: Number,
      min: [0, 'Story points cannot be negative'],
      max: [100, 'Story points cannot exceed 100'],
      default: 0,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    dependsOn: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      maxlength: [500, 'Block reason cannot exceed 500 characters'],
      default: '',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, sprint: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ project: 1, priority: 1 });
taskSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 5 } }
);

taskSchema.statics.STATUSES = STATUSES;
taskSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model('Task', taskSchema);
