const asyncHandler = require('../utils/asyncHandler');
const webhookService = require('../services/webhook.service');
const { generateSimulatedWebhookPayload } = require('../utils/webhook.utils');

/**
 * Helper to extract request tracing context
 */
const getRequestContext = (req) => ({
  requestId: req.headers['x-request-id'] || null,
  correlationId: req.headers['x-correlation-id'] || null,
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'] || null,
});

/**
 * @route   POST /api/v1/webhooks/gateway
 * @desc    Main ingestion endpoint for live / simulated gateway webhooks
 * @access  Public (Signature-Verified)
 */
const receiveGatewayWebhook = asyncHandler(async (req, res) => {
  const signature =
    req.headers['x-gateway-signature'] ||
    req.headers['stripe-signature'] ||
    req.headers['x-signature'] ||
    req.body.signature ||
    null;

  const result = await webhookService.processWebhookEvent({
    payload: req.body,
    headers: req.headers,
    signature,
    requestContext: getRequestContext(req),
  });

  res.status(200).json(result);
});

/**
 * @route   POST /api/v1/webhooks/simulate
 * @desc    Development & testing endpoint to generate and ingest simulated gateway events
 * @access  Public / Development Helper
 */
const simulateWebhook = asyncHandler(async (req, res) => {
  const {
    merchantCode,
    gateway,
    amount,
    currency,
    status,
    rawFailureReason,
    issuingBank,
    customerRef,
  } = req.body;

  const { payload, signature, headers } = generateSimulatedWebhookPayload({
    merchantCode,
    gateway,
    amount,
    currency,
    status,
    rawFailureReason,
    issuingBank,
    customerRef,
  });

  const result = await webhookService.processWebhookEvent({
    payload,
    headers,
    signature,
    requestContext: getRequestContext(req),
  });

  res.status(200).json({
    success: true,
    message: 'Simulated webhook generated and processed successfully',
    simulatedPayload: payload,
    result,
  });
});

/**
 * @route   GET /api/v1/webhooks/events
 * @desc    List raw WebhookEvent buffer records
 * @access  Private (Admin, Support, Merchant [self only])
 */
const listWebhookEvents = asyncHandler(async (req, res) => {
  const result = await webhookService.listWebhookEvents({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.events.length,
    pagination: result.pagination,
    events: result.events,
  });
});

/**
 * @route   GET /api/v1/webhooks/events/:id
 * @desc    Get detailed raw WebhookEvent record
 * @access  Private (Admin, Support, Merchant [self only])
 */
const getWebhookEventById = asyncHandler(async (req, res) => {
  const event = await webhookService.getWebhookEventById(req.params.id, req.user);

  res.status(200).json({
    success: true,
    event,
  });
});

/**
 * @route   POST /api/v1/webhooks/events/:id/replay
 * @desc    Replay a failed or stuck WebhookEvent through the ingestion engine
 * @access  Private (Admin, Support Only)
 */
const replayWebhookEvent = asyncHandler(async (req, res) => {
  const result = await webhookService.replayWebhookEvent(
    req.params.id,
    req.user,
    getRequestContext(req)
  );

  res.status(200).json({
    success: true,
    message: 'Webhook event replayed successfully',
    result,
  });
});

module.exports = {
  receiveGatewayWebhook,
  simulateWebhook,
  listWebhookEvents,
  getWebhookEventById,
  replayWebhookEvent,
};
