const AppError = require('../utils/AppError');
const { USER_ROLES } = require('../constants/enums');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate user login payload
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate user registration / creation payload
 */
const validateRegister = (req, res, next) => {
  const { name, email, password, role, merchant } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters long' });
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  if (role && !Object.values(USER_ROLES).includes(role)) {
    errors.push({
      field: 'role',
      message: `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`,
    });
  }

  // If role is explicitly MERCHANT (or default is MERCHANT), require merchant reference
  const effectiveRole = role || USER_ROLES.MERCHANT;
  if (effectiveRole === USER_ROLES.MERCHANT && !merchant) {
    errors.push({ field: 'merchant', message: 'Merchant ID reference is required for MERCHANT role' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  req.body.email = email.trim().toLowerCase();
  req.body.name = name.trim();
  next();
};

/**
 * Validate password change payload
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const errors = [];

  if (!currentPassword || typeof currentPassword !== 'string') {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    errors.push({ field: 'newPassword', message: 'New password must be at least 8 characters long' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'New password and confirm password do not match' });
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push({ field: 'newPassword', message: 'New password must be different from current password' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

module.exports = {
  validateLogin,
  validateRegister,
  validateChangePassword,
};
