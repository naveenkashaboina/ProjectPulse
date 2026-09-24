/**
 * Create a consistent API response envelope
 */
const sendResponse = (res, statusCode, data, meta = null) => {
  const response = {
    success: true,
    data,
  };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Create pagination metadata
 */
const getPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse query params for pagination
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Log an activity to the ActivityLog collection
 */
const logActivity = async (ActivityLog, { organization, project, actor, action, entityType, entityId, metadata = {} }) => {
  try {
    await ActivityLog.create({
      organization,
      project,
      actor,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Create a notification for a user
 */
const createNotification = async (Notification, { user, type, title, message, payload = {}, link = null }) => {
  try {
    await Notification.create({ user, type, title, message, payload, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

/**
 * Parse @mentions from comment body and return user references
 */
const parseMentions = (body, userMap) => {
  const mentionRegex = /@(\w+(?:\.\w+)*)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    const username = match[1].toLowerCase();
    if (userMap[username]) {
      mentions.push(userMap[username]);
    }
  }
  return [...new Set(mentions.map(String))];
};

/**
 * Escape regular expression special characters in user input to prevent ReDoS.
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  sendResponse,
  getPagination,
  parsePagination,
  logActivity,
  createNotification,
  parseMentions,
  escapeRegex,
};
