const AppError = require('../utils/AppError');

/**
 * RestrictTo Middleware
 * Role-Based Access Control (RBAC) guard.
 * Ensures the authenticated user has one of the required roles.
 *
 * @param  {...string} roles - Permitted roles (e.g. 'ADMIN', 'MERCHANT', 'SUPPORT')
 * @returns {Function} Express middleware function
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Permission denied. Required role: [${roles.join(', ')}]. Your role: ${req.user ? req.user.role : 'ANONYMOUS'}`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
};

module.exports = {
  restrictTo,
};
