const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results.
 * Returns 400 with field-level error messages if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fields = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
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
  next();
};

module.exports = validate;
