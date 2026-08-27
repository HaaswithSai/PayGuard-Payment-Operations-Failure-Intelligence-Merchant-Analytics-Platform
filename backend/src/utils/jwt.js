const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('./AppError');

/**
 * Generate signed JWT token
 * @param {object} payload - Data to embed in token (id, role, email, merchant)
 * @param {object} [options] - Additional jwt.sign options
 * @returns {string} Signed JWT
 */
const signToken = (payload, options = {}) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    ...options,
  });
};

/**
 * Verify and decode JWT token
 * @param {string} token - Bearer JWT
 * @returns {object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid authentication token. Please log in again.', 401, 'INVALID_TOKEN');
    }
    throw new AppError('Authentication failed. Please log in again.', 401, 'UNAUTHORIZED');
  }
};

module.exports = {
  signToken,
  verifyToken,
};
