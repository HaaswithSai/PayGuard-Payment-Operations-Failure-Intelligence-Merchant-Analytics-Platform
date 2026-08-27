const AppError = require('../utils/AppError');
const { USER_ROLES } = require('../constants/enums');

/**
 * Tenant Scoping Middleware
 * Restricts MERCHANT users to only view their own merchant record.
 * ADMIN and SUPPORT operators bypass this check.
 */
const checkMerchantTenantAccess = (req, res, next) => {
  const { role, merchant } = req.user;

  // Platform Admins and Support staff have global inspection privileges
  if (role === USER_ROLES.ADMIN || role === USER_ROLES.SUPPORT) {
    return next();
  }

  // Merchant users must have an associated merchant ID
  if (role === USER_ROLES.MERCHANT) {
    if (!merchant) {
      return next(
        new AppError('No merchant profile is associated with this user account.', 403, 'MERCHANT_UNASSIGNED')
      );
    }

    // If route includes :id param, enforce that it matches the user's merchant ID
    if (req.params.id && req.params.id !== merchant.toString()) {
      return next(
        new AppError(
          'Access forbidden: You do not have permission to access another merchant profile.',
          403,
          'TENANT_ACCESS_DENIED'
        )
      );
    }
  }

  next();
};

module.exports = {
  checkMerchantTenantAccess,
};
