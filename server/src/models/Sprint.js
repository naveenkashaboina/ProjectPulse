const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    goal: {
      type: String,
      maxlength: [500, 'Goal cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
    },
  },
  { timestamps: true }
);

sprintSchema.index({ project: 1, status: 1 });

sprintSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

module.exports = mongoose.model('Sprint', sprintSchema);
