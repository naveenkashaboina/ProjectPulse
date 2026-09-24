const mongoose = require('mongoose');

const ROLES = ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'];

const projectMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be one of: ' + ROLES.join(', '),
      },
      required: [true, 'Role is required'],
    },
  },
  { timestamps: true }
);

projectMembershipSchema.index({ user: 1, project: 1 }, { unique: true });
projectMembershipSchema.index({ project: 1 });
projectMembershipSchema.index({ user: 1 });

projectMembershipSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('ProjectMembership', projectMembershipSchema);
