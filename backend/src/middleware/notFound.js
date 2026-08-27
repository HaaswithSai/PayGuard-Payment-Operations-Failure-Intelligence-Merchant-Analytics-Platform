const AppError = require('../utils/AppError');

/**
 * 404 Not Found Middleware
 * Catch-all handler for unmapped endpoints.
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Resource not found: [${req.method}] ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

module.exports = notFound;
