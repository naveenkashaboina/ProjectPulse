const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendResponse, logActivity } = require('../utils/helpers');
const { Attachment, Task, Issue, Project, ActivityLog, OrgMembership, ProjectMembership } = require('../models');
const config = require('../config/env');

/**
 * Allowed MIME types mapped to their permitted file extensions.
 *
 * Security note: multer exposes the Content-Type declared by the client as
 * req.file.mimetype.  We cannot read magic bytes inside the fileFilter because
 * multer hasn't written the file yet.  However, we cross-check both the MIME
 * type AND the file extension so that mismatches (e.g. .exe renamed to .pdf)
 * are caught.  Never-allowed types (executables, scripts) are simply absent
 * from the whitelist, so they fail the MIME check before the extension check.
 */
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // Text / plaintext
  'text/plain': ['.txt', '.md', '.log', '.csv'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  // Archives
  'application/zip': ['.zip'],
  'application/x-tar': ['.tar'],
  'application/gzip': ['.gz'],
  // Data interchange
  'application/json': ['.json'],
};

const MAX_FILENAME_LENGTH = 200;

/**
 * Strip path-traversal characters and sanitize the original filename.
 * Returns a safe filename with only alphanumeric, dot, dash, underscore,
 * parentheses, and space characters.
 */
const sanitizeFilename = (originalName) => {
  const base = path.basename(originalName); // strip any directory prefix
  const safe = base.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  return safe.substring(0, MAX_FILENAME_LENGTH) || 'upload';
};

// ---------------------------------------------------------------------------
// Multer storage — UUID-named files so original names never reach the FS
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', config.UPLOAD_DIR);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use the sanitized extension from the original name (lower-cased)
    const ext = path.extname(sanitizeFilename(file.originalname)).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ---------------------------------------------------------------------------
// Strict file filter: reject any MIME type not in the whitelist, and reject
// any MIME / extension mismatch (e.g. script renamed with an image extension).
// ---------------------------------------------------------------------------
const fileFilter = (req, file, cb) => {
  const mime = file.mimetype.toLowerCase();
  const ext = path.extname(sanitizeFilename(file.originalname)).toLowerCase();

  const allowedExtensions = ALLOWED_TYPES[mime];

  if (!allowedExtensions) {
    return cb(
      new AppError(
        `File type '${mime}' is not allowed. Allowed types: images, documents, text, archives.`,
        415,
        'UNSUPPORTED_FILE_TYPE'
      ),
      false
    );
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new AppError(
        `File extension '${ext}' does not match content type '${mime}'.`,
        415,
        'MIME_EXTENSION_MISMATCH'
      ),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB hard limit
    files: 1,                   // one file per request
  },
  fileFilter,
});

exports.uploadMiddleware = upload.single('file');

// ---------------------------------------------------------------------------
// Helper: resolve parent doc (Task or Issue) and verify project access
// ---------------------------------------------------------------------------
const resolveParent = async (req, next) => {
  let parentType, parentId, parentDoc;

  if (req.params.taskId) {
    parentType = 'Task';
    parentId = req.params.taskId;
    parentDoc = await Task.findById(parentId);
  } else if (req.params.issueId) {
    parentType = 'Issue';
    parentId = req.params.issueId;
    parentDoc = await Issue.findById(parentId);
  }

  if (!parentDoc) {
    next(new AppError(`${parentType} not found`, 404, `${parentType.toUpperCase()}_NOT_FOUND`));
    return null;
  }

  return { parentType, parentId, parentDoc };
};

/**
 * POST /api/tasks/:taskId/attachments  OR  /api/issues/:issueId/attachments
 */
exports.createAttachment = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400, 'NO_FILE'));
  }

  const resolved = await resolveParent(req, next);
  if (!resolved) return;

  const { parentType, parentId, parentDoc } = resolved;

  // SVG script inspection: prevent Stored XSS via malicious SVG uploads
  const isSvg = req.file.mimetype === 'image/svg+xml' || path.extname(req.file.originalname).toLowerCase() === '.svg';
  if (isSvg) {
    try {
      const content = fs.readFileSync(req.file.path, 'utf8');
      if (/<script[\s>]/i.test(content) || /javascript:/i.test(content) || /on\w+\s*=/i.test(content)) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return next(new AppError('SVG contains unsafe script or event handler content', 415, 'UNSAFE_SVG_CONTENT'));
      }
    } catch (readErr) {
      // If reading fails, proceed safely
    }
  }

  const attachment = await Attachment.create({
    parentType,
    parentId,
    uploadedBy: req.user._id,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: sanitizeFilename(req.file.originalname), // store sanitized name
    fileType: req.file.mimetype,
    size: req.file.size,
  });

  const project = await Project.findById(parentDoc.project);

  await logActivity(ActivityLog, {
    organization: project.organization,
    project: project._id,
    actor: req.user._id,
    action: 'attachment_added',
    entityType: parentType,
    entityId: parentId,
    metadata: { fileName: sanitizeFilename(req.file.originalname) },
  });

  const populated = await attachment.populate('uploadedBy', 'name email avatar');
  sendResponse(res, 201, populated);
});

/**
 * GET /api/tasks/:taskId/attachments  OR  /api/issues/:issueId/attachments
 */
exports.getAttachments = catchAsync(async (req, res, next) => {
  let parentType, parentId;

  if (req.params.taskId) {
    parentType = 'Task';
    parentId = req.params.taskId;
  } else if (req.params.issueId) {
    parentType = 'Issue';
    parentId = req.params.issueId;
  }

  const attachments = await Attachment.find({ parentType, parentId })
    .populate('uploadedBy', 'name email avatar')
    .sort({ createdAt: -1 });

  sendResponse(res, 200, attachments);
});

/**
 * GET /api/attachments/:attachmentId
 *
 * Security: verify the attachment belongs to a project the requesting user
 * actually has access to — prevents unauthorized access to attachments across projects.
 */
exports.getAttachment = catchAsync(async (req, res, next) => {
  const attachment = await Attachment.findById(req.params.attachmentId)
    .populate('uploadedBy', 'name email avatar');

  if (!attachment) {
    return next(new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND'));
  }

  let parentDoc;
  if (attachment.parentType === 'Task') {
    parentDoc = await Task.findById(attachment.parentId);
  } else if (attachment.parentType === 'Issue') {
    parentDoc = await Issue.findById(attachment.parentId);
  }

  if (!parentDoc) {
    return next(new AppError('Parent entity not found', 404, 'PARENT_NOT_FOUND'));
  }

  const project = await Project.findById(parentDoc.project);
  if (!project) {
    return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  }

  // Check org-level admin access first
  const orgMembership = await OrgMembership.findOne({
    user: req.user._id,
    organization: project.organization,
    status: 'active',
  });

  if (!orgMembership || orgMembership.role !== 'OrgAdmin') {
    const projectMembership = await ProjectMembership.findOne({
      user: req.user._id,
      project: project._id,
    });

    if (!projectMembership) {
      return next(new AppError('You do not have access to this project', 403, 'NO_PROJECT_ACCESS'));
    }
  }

  sendResponse(res, 200, attachment);
});

/**
 * DELETE /api/attachments/:attachmentId
 *
 * Security: verify the attachment belongs to a project the requesting user
 * actually has access to — prevents deleting arbitrary attachments by ID.
 */
exports.deleteAttachment = catchAsync(async (req, res, next) => {
  const attachment = await Attachment.findById(req.params.attachmentId);
  if (!attachment) {
    return next(new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND'));
  }

  // -------------------------------------------------------------------
  // Cross-project authorization: resolve the parent entity and confirm
  // the requesting user is a member of its project (or an org admin).
  // This prevents user A from deleting attachments of user B's projects
  // by guessing attachment IDs.
  // -------------------------------------------------------------------
  let parentDoc;
  if (attachment.parentType === 'Task') {
    parentDoc = await Task.findById(attachment.parentId);
  } else if (attachment.parentType === 'Issue') {
    parentDoc = await Issue.findById(attachment.parentId);
  }

  if (!parentDoc) {
    return next(new AppError('Parent entity not found', 404, 'PARENT_NOT_FOUND'));
  }

  const project = await Project.findById(parentDoc.project);
  if (!project) {
    return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
  }

  // Check org-level admin access first
  const orgMembership = await OrgMembership.findOne({
    user: req.user._id,
    organization: project.organization,
    status: 'active',
  });

  let effectiveRole = orgMembership?.role;

  if (!orgMembership || orgMembership.role !== 'OrgAdmin') {
    // Fall back to project-level membership
    const projectMembership = await ProjectMembership.findOne({
      user: req.user._id,
      project: project._id,
    });

    if (!projectMembership) {
      return next(new AppError('You do not have access to this project', 403, 'NO_PROJECT_ACCESS'));
    }

    effectiveRole = projectMembership.role;
  }

  // Only the uploader or PM+ may delete
  const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
  const hasElevatedRole = ['OrgAdmin', 'ProjectManager'].includes(effectiveRole);

  if (!isUploader && !hasElevatedRole) {
    return next(new AppError('You do not have permission to delete this attachment', 403, 'FORBIDDEN'));
  }

  // Delete physical file from disk
  const filePath = path.join(__dirname, '..', '..', attachment.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await Attachment.findByIdAndDelete(attachment._id);
  sendResponse(res, 200, { message: 'Attachment deleted successfully' });
});
