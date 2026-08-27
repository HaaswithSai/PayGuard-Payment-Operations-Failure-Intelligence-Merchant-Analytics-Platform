const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { PAYMENT_GATEWAYS } = require('../constants/enums');

const ALLOWED_GROUP_BY = ['hour', 'day', 'week', 'month'];

/**
 * Validate Analytics Query Parameters
 */
const validateAnalyticsQuery = (req, res, next) => {
  const { startDate, endDate, groupBy, limit, gateway, merchantId } = req.query;
  const errors = [];

  // 1. Date Validation
  if (startDate && isNaN(new Date(startDate).getTime())) {
    errors.push({ field: 'startDate', message: 'startDate must be a valid ISO date string' });
  }
  if (endDate && isNaN(new Date(endDate).getTime())) {
    errors.push({ field: 'endDate', message: 'endDate must be a valid ISO date string' });
  }

  // 2. GroupBy Validation
  if (groupBy && !ALLOWED_GROUP_BY.includes(groupBy.toLowerCase())) {
    errors.push({
      field: 'groupBy',
      message: `Invalid groupBy parameter. Allowed values: ${ALLOWED_GROUP_BY.join(', ')}`,
    });
  }

  // 3. Limit Validation
  if (limit !== undefined) {
    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 100) {
      errors.push({ field: 'limit', message: 'Limit must be a number between 1 and 100' });
    }
  }

  // 4. Gateway Validation
  if (gateway && !Object.values(PAYMENT_GATEWAYS).includes(gateway.toUpperCase())) {
    errors.push({
      field: 'gateway',
      message: `Invalid gateway: '${gateway}'. Allowed: ${Object.values(PAYMENT_GATEWAYS).join(', ')}`,
    });
  }

  // 5. Merchant ID Validation
  if (merchantId && !mongoose.Types.ObjectId.isValid(merchantId)) {
    errors.push({ field: 'merchantId', message: `Invalid merchantId format: '${merchantId}'` });
  }

  if (errors.length > 0) {
    return next(new AppError('Analytics query validation failed', 400, 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};

module.exports = {
  validateAnalyticsQuery,
};
