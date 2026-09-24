const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'on-hold'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    prefix: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 6,
      default: null,
    },
  },
  { timestamps: true }
);

projectSchema.index({ organization: 1, status: 1 });
projectSchema.index({ organization: 1, name: 1 }, { unique: true });
projectSchema.index({ team: 1 });

module.exports = mongoose.model('Project', projectSchema);
