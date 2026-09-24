const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const standardRateLimitMessage = {
  success: false,
  error: {
    code: 'RATE_LIMIT',
    message: 'Too many requests, please try again later',
  },
};

const createLimiter = (options) => {
  if (config.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT) {
    return (req, res, next) => next();
  }
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: standardRateLimitMessage,
    ...options,
  });
};

// General API rate limiter — generous enough for active Kanban boards, dashboards, and polling
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
});

// Stricter rate limiter for auth routes (brute-force defense)
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
});

// Stricter rate limiter for invitations
const inviteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
});

// Rate limiter for file uploads to prevent disk exhaustion
const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
});

module.exports = {
  createLimiter,
  apiLimiter,
  authLimiter,
  inviteLimiter,
  uploadLimiter,
};
