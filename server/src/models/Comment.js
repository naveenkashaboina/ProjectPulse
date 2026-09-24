const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    parentType: {
      type: String,
      enum: ['Task', 'Issue'],
      required: [true, 'Parent type is required'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Parent ID is required'],
      refPath: 'parentType',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    body: {
      type: String,
      required: [true, 'Comment body is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

commentSchema.index({ parentType: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
