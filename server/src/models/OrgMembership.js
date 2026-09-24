const mongoose = require('mongoose');

const ROLES = ['OrgAdmin', 'ProjectManager', 'TeamLead', 'Developer', 'Stakeholder'];

const orgMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: function () {
        return this.status === 'active';
      },
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be one of: ' + ROLES.join(', '),
      },
      required: [true, 'Role is required'],
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['invited', 'active'],
      default: 'active',
    },
    inviteToken: {
      type: String,
      default: null,
      select: false,
    },
    inviteEmail: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

orgMembershipSchema.index({ user: 1, organization: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true } } });
orgMembershipSchema.index({ organization: 1 });
orgMembershipSchema.index({ inviteToken: 1 }, { sparse: true });

orgMembershipSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('OrgMembership', orgMembershipSchema);
