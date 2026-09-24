const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization must have an owner'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    settings: {
      defaultProjectStatus: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
      },
      maxStoryPoints: {
        type: Number,
        default: 100,
        min: 1,
        max: 1000,
      },
    },
  },
  { timestamps: true }
);

organizationSchema.index({ owner: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
