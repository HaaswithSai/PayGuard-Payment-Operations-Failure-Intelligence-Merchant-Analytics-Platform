const env = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Handle Mongoose CastError (e.g. invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid value '${err.value}' for field '${err.path}'`;
  return new AppError(message, 400, 'INVALID_FIELD_VALUE');
};

/**
 * Handle MongoDB duplicate key error (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const fieldName = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  const fieldValue = err.keyValue ? err.keyValue[fieldName] : 'value';
  const message = `Duplicate value '${fieldValue}' for field '${fieldName}'. Please use another value.`;
  return new AppError(message, 409, 'DUPLICATE_RESOURCE', {
    field: fieldName,
    duplicateValue: fieldValue,
  });
};

/**
 * Handle Mongoose ValidationError
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
    value: el.value,
  }));
  const message = `Validation error: ${errors.map((e) => e.message).join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_FAILED', errors);
};

/**
 * Handle JSON syntax parse error
 */
const handleJSONSyntaxError = () => {
  return new AppError('Malformed JSON payload in request body', 400, 'INVALID_JSON');
};

/**
 * Centralized Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Ensure default properties
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';
  error.code = error.code || 'INTERNAL_SERVER_ERROR';

  // Normalize specific database/parsing errors
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = handleJSONSyntaxError();
  }

  // Log 500 server errors
  if (error.statusCode >= 500) {
    logger.error(`[500 Server Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn(`[${error.statusCode} Client Error] ${req.method} ${req.originalUrl}: ${error.message}`);
  }

  // Build client response
  const responsePayload = {
    success: false,
    status: error.status,
    message: error.message || 'An unexpected error occurred',
    error: {
      code: error.code,
      details: error.details || null,
    },
  };

  // Attach stack trace only in development
  if (env.isDevelopment) {
    responsePayload.stack = err.stack;
  }

  res.status(error.statusCode).json(responsePayload);
};

module.exports = errorHandler;
