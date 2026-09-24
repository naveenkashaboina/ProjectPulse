const AppError = require('../utils/AppError');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const fields = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields,
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `Duplicate value for ${field}. This ${field} already exists.`,
        fields: [{ field, message: `${field} already exists` }],
      },
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ${err.path}: ${err.value}`,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
    });
  }

  // Multer errors (e.g. LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }

  // Operational errors (safe to expose)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
    });
  }

  // Programming errors — log full stack, send generic message
  console.error('UNHANDLED ERROR:', err);

  const message =
    config.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred';

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};

module.exports = errorHandler;
