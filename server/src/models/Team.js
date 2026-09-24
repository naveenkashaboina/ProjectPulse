const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

teamSchema.index({ organization: 1 });
teamSchema.index({ organization: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
