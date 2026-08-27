const { User } = require('../models');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { USER_STATUS } = require('../constants/enums');

/**
 * Protect Middleware
 * Verifies JWT Bearer token, checks user state, and attaches current user to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract Bearer token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError(
        'Authentication required. Please provide a Bearer token in the Authorization header.',
        401,
        'UNAUTHORIZED'
      )
    );
  }

  // 2. Verify JWT signature & expiration
  const decoded = verifyToken(token);

  // 3. Check if user still exists and is not soft-deleted
  const currentUser = await User.findOne({ _id: decoded.id, isDeleted: false });
  if (!currentUser) {
    return next(
      new AppError('The user account belonging to this token no longer exists.', 401, 'USER_NOT_FOUND')
    );
  }

  // 4. Verify account is ACTIVE
  if (currentUser.status !== USER_STATUS.ACTIVE) {
    return next(
      new AppError(
        `Your account is currently ${currentUser.status.toLowerCase()}. Access denied.`,
        403,
        'ACCOUNT_DISABLED'
      )
    );
  }

  // 5. Check if user changed password after token was issued
  if (currentUser.lastPasswordChange) {
    const passwordChangedTimestamp = parseInt(currentUser.lastPasswordChange.getTime() / 1000, 10);
    if (decoded.iat < passwordChangedTimestamp) {
      return next(
        new AppError(
          'Your password was recently changed. Please log in again with your new credentials.',
          401,
          'TOKEN_INVALIDATED'
        )
      );
    }
  }

  // 6. Grant Access & attach user to request object
  req.user = currentUser;
  req.user.id = currentUser._id.toString();
  next();
});

module.exports = {
  protect,
};
