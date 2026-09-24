const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    name: {
      type: String,
      required: [true, 'Label name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)'],
      default: '#6366f1',
    },
  },
  { timestamps: true }
);

labelSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);
