const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      default: 'application/octet-stream',
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
  },
  { timestamps: true }
);

attachmentSchema.index({ parentType: 1, parentId: 1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
