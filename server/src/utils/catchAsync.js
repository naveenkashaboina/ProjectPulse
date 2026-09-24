/**
 * Wraps an async route handler to catch promise rejections
 * and forward them to Express error middleware.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
