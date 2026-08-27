/**
 * AppError Class
 * Custom error class for handling operational errors across the application.
 * Operational errors are predictable errors (e.g. invalid input, unauthorized access, not found)
 * as opposed to programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
   * @param {string} [code] - Machine-readable error code (e.g. 'RESOURCE_NOT_FOUND', 'VALIDATION_FAILED')
   * @param {Array|Object} [details] - Optional contextual details or field-level validation errors
   */
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code || (this.status === 'fail' ? 'BAD_REQUEST' : 'INTERNAL_ERROR');
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
