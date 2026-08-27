const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { MERCHANT_STATUS, PAYMENT_GATEWAYS } = require('../constants/enums');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MERCHANT_CODE_REGEX = /^[A-Z0-9_-]{3,50}$/;

/**
 * Validate MongoDB ObjectId parameter (:id)
 */
const validateMerchantIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError(`Invalid merchant ID format: '${id}'`, 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

/**
 * Validate Merchant Creation Payload
 */
const validateCreateMerchant = (req, res, next) => {
  const { merchantCode, name, contactEmail, contactPhone, status, configuration } = req.body;
  const errors = [];

  // 1. Merchant Code
  if (!merchantCode || typeof merchantCode !== 'string') {
    errors.push({ field: 'merchantCode', message: 'Merchant code is required' });
  } else {
    const normalizedCode = merchantCode.trim().toUpperCase();
    if (!MERCHANT_CODE_REGEX.test(normalizedCode)) {
      errors.push({
        field: 'merchantCode',
        message: 'Merchant code must be 3-50 uppercase alphanumeric characters (hyphens/underscores allowed)',
      });
    }
    req.body.merchantCode = normalizedCode;
  }

  // 2. Name
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Merchant name is required and must be between 2 and 150 characters' });
  } else {
    req.body.name = name.trim();
  }

  // 3. Contact Email
  if (!contactEmail || typeof contactEmail !== 'string' || !EMAIL_REGEX.test(contactEmail.trim())) {
    errors.push({ field: 'contactEmail', message: 'A valid contact email address is required' });
  } else {
    req.body.contactEmail = contactEmail.trim().toLowerCase();
  }

  // 4. Contact Phone (optional)
  if (contactPhone && typeof contactPhone === 'string') {
    req.body.contactPhone = contactPhone.trim();
  }

  // 5. Status (optional)
  if (status && !Object.values(MERCHANT_STATUS).includes(status)) {
    errors.push({
      field: 'status',
      message: `Invalid status. Must be one of: ${Object.values(MERCHANT_STATUS).join(', ')}`,
    });
  }

  // 6. Configuration (optional)
  if (configuration && typeof configuration === 'object') {
    const configErrors = validateConfigObject(configuration);
    errors.push(...configErrors);
  }

  if (errors.length > 0) {
    return next(new AppError('Merchant validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Validate General Merchant Update Payload
 */
const validateUpdateMerchant = (req, res, next) => {
  const { name, contactEmail, contactPhone, status } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150) {
      errors.push({ field: 'name', message: 'Merchant name must be between 2 and 150 characters' });
    } else {
      req.body.name = name.trim();
    }
  }

  if (contactEmail !== undefined) {
    if (typeof contactEmail !== 'string' || !EMAIL_REGEX.test(contactEmail.trim())) {
      errors.push({ field: 'contactEmail', message: 'Please provide a valid contact email address' });
    } else {
      req.body.contactEmail = contactEmail.trim().toLowerCase();
    }
  }

  if (contactPhone !== undefined && typeof contactPhone === 'string') {
    req.body.contactPhone = contactPhone.trim();
  }

  if (status !== undefined && !Object.values(MERCHANT_STATUS).includes(status)) {
    errors.push({
      field: 'status',
      message: `Invalid status. Must be one of: ${Object.values(MERCHANT_STATUS).join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return next(new AppError('Merchant update validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Validate Merchant Configuration Update Payload
 */
const validateUpdateConfiguration = (req, res, next) => {
  const configuration = req.body;
  const errors = validateConfigObject(configuration);

  if (errors.length > 0) {
    return next(new AppError('Configuration validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Validate Merchant Status Update Payload
 */
const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !Object.values(MERCHANT_STATUS).includes(status)) {
    return next(
      new AppError(
        `Invalid status: '${status}'. Must be one of: ${Object.values(MERCHANT_STATUS).join(', ')}`,
        400,
        'INVALID_STATUS'
      )
    );
  }
  next();
};

/**
 * Helper to validate configuration subdocument fields
 */
function validateConfigObject(config) {
  const errors = [];

  if (config.supportedGateways !== undefined) {
    if (!Array.isArray(config.supportedGateways) || config.supportedGateways.length === 0) {
      errors.push({
        field: 'configuration.supportedGateways',
        message: 'supportedGateways must be a non-empty array of gateway identifiers',
      });
    } else {
      const validGateways = Object.values(PAYMENT_GATEWAYS);
      for (const gw of config.supportedGateways) {
        if (!validGateways.includes(gw)) {
          errors.push({
            field: 'configuration.supportedGateways',
            message: `Invalid gateway: '${gw}'. Supported: ${validGateways.join(', ')}`,
          });
        }
      }
    }
  }

  if (config.defaultCurrency !== undefined) {
    if (typeof config.defaultCurrency !== 'string' || config.defaultCurrency.trim().length !== 3) {
      errors.push({
        field: 'configuration.defaultCurrency',
        message: 'defaultCurrency must be a 3-letter currency code (e.g. USD, EUR)',
      });
    } else {
      config.defaultCurrency = config.defaultCurrency.trim().toUpperCase();
    }
  }

  if (config.retryPolicy !== undefined && typeof config.retryPolicy === 'object') {
    const { maxRetries, backoffFactorMs, timeoutMs } = config.retryPolicy;

    if (maxRetries !== undefined && (typeof maxRetries !== 'number' || maxRetries < 0 || maxRetries > 10)) {
      errors.push({ field: 'configuration.retryPolicy.maxRetries', message: 'maxRetries must be between 0 and 10' });
    }
    if (backoffFactorMs !== undefined && (typeof backoffFactorMs !== 'number' || backoffFactorMs < 100)) {
      errors.push({
        field: 'configuration.retryPolicy.backoffFactorMs',
        message: 'backoffFactorMs must be at least 100ms',
      });
    }
    if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || timeoutMs < 500)) {
      errors.push({ field: 'configuration.retryPolicy.timeoutMs', message: 'timeoutMs must be at least 500ms' });
    }
  }

  return errors;
}

module.exports = {
  validateMerchantIdParam,
  validateCreateMerchant,
  validateUpdateMerchant,
  validateUpdateConfiguration,
  validateUpdateStatus,
};
