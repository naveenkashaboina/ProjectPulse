const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'created', 'updated', 'deleted', 'archived',
        'status_changed', 'assigned', 'unassigned',
        'comment_added', 'attachment_added',
        'member_added', 'member_removed',
        'sprint_started', 'sprint_completed',
        'milestone_completed', 'blocker_added', 'blocker_removed',
        'issue_reported', 'issue_resolved',
      ],
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: [
        'Organization', 'Project', 'Team', 'Task', 'Issue',
        'Sprint', 'Milestone', 'Comment', 'Attachment', 'Member',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
