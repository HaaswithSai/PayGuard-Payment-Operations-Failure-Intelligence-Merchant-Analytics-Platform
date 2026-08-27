const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { PAYMENT_GATEWAYS, PAYMENT_STATUS } = require('../constants/enums');

/**
 * Validate incoming Webhook Ingestion Payload
 */
const validateWebhookPayload = (req, res, next) => {
  const {
    eventId,
    merchantCode,
    merchantId,
    gateway,
    paymentId,
    idempotencyKey,
    status,
    amount,
    currency,
  } = req.body;

  const errors = [];

  // 1. Event ID
  if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
    errors.push({ field: 'eventId', message: 'Event ID (eventId) is required' });
  }

  // 2. Merchant Identifier (merchantCode or merchantId)
  if (!merchantCode && !merchantId) {
    errors.push({
      field: 'merchant',
      message: 'Either merchantCode or merchantId must be provided in the payload',
    });
  }

  // 3. Gateway Provider
  if (!gateway || !Object.values(PAYMENT_GATEWAYS).includes(gateway)) {
    errors.push({
      field: 'gateway',
      message: `Invalid gateway: '${gateway}'. Supported: ${Object.values(PAYMENT_GATEWAYS).join(', ')}`,
    });
  }

  // 4. Payment ID
  if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
    errors.push({ field: 'paymentId', message: 'Payment transaction ID (paymentId) is required' });
  }

  // 5. Idempotency Key
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    errors.push({ field: 'idempotencyKey', message: 'Idempotency key is required' });
  }

  // 6. Payment Status
  if (!status || !Object.values(PAYMENT_STATUS).includes(status)) {
    errors.push({
      field: 'status',
      message: `Invalid payment status: '${status}'. Supported: ${Object.values(PAYMENT_STATUS).join(', ')}`,
    });
  }

  // 7. Amount
  if (amount === undefined || typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    errors.push({ field: 'amount', message: 'Amount must be a non-negative number' });
  }

  // 8. Currency
  if (!currency || typeof currency !== 'string' || currency.trim().length !== 3) {
    errors.push({ field: 'currency', message: 'Currency must be a 3-letter code (e.g. USD, EUR, GBP)' });
  }

  if (errors.length > 0) {
    return next(new AppError('Webhook payload validation failed', 400, 'INVALID_WEBHOOK_PAYLOAD', errors));
  }

  // Normalize fields
  if (req.body.merchantCode) {
    req.body.merchantCode = req.body.merchantCode.trim().toUpperCase();
  }
  if (req.body.currency) {
    req.body.currency = req.body.currency.trim().toUpperCase();
  }

  next();
};

/**
 * Validate MongoDB ObjectId parameter (:id) for WebhookEvent lookup
 */
const validateWebhookEventIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError(`Invalid webhook event ID format: '${id}'`, 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

module.exports = {
  validateWebhookPayload,
  validateWebhookEventIdParam,
};
