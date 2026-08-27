const { WebhookEvent, Payment, Merchant, ProcessingQueue, AuditLog } = require('../models');
const { verifyHmacSignature } = require('../utils/webhook.utils');
const AppError = require('../utils/AppError');
const {
  WEBHOOK_STATUS,
  PAYMENT_STATUS,
  QUEUE_JOB_TYPES,
  QUEUE_JOB_STATUS,
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  USER_ROLES,
} = require('../constants/enums');
const logger = require('../utils/logger');

/**
 * Record an audit log entry for webhook lifecycle events
 */
const recordWebhookAudit = async ({
  action,
  entityType,
  entityId,
  actorUser = null,
  beforeSnapshot = null,
  afterSnapshot = null,
  requestContext = {},
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actorUser: actorUser ? actorUser._id || actorUser.id : null,
      actorRole: actorUser ? actorUser.role : AUDIT_ACTOR_ROLES.SYSTEM,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : 'UNKNOWN',
      beforeSnapshot,
      afterSnapshot,
      requestId: requestContext.requestId || null,
      correlationId: requestContext.correlationId || null,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      metadata,
    });
  } catch (err) {
    logger.error(`Failed to record webhook audit: ${err.message}`);
  }
};

/**
 * Service: Process and Ingest Webhook Event
 */
const processWebhookEvent = async ({ payload, headers = {}, signature = null, requestContext = {} }) => {
  const isSimulated = payload.gateway === 'SIMULATED';

  // 1. Merchant Resolution
  let merchant = null;
  if (payload.merchantCode) {
    merchant = await Merchant.findOne({
      merchantCode: payload.merchantCode.trim().toUpperCase(),
      isDeleted: false,
    });
  } else if (payload.merchantId) {
    merchant = await Merchant.findOne({
      _id: payload.merchantId,
      isDeleted: false,
    });
  }

  // 2. Validate Merchant Existence & Status
  if (!merchant) {
    // Record raw WebhookEvent buffer as FAILED before rejecting
    await WebhookEvent.create({
      eventId: payload.eventId,
      gateway: payload.gateway,
      webhookHeaders: headers,
      rawPayload: payload,
      signature: signature || null,
      processingStatus: WEBHOOK_STATUS.FAILED,
      errorMessage: `Merchant '${payload.merchantCode || payload.merchantId}' not found`,
    });

    throw new AppError(
      `Merchant '${payload.merchantCode || payload.merchantId}' was not found or is deactivated`,
      404,
      'MERCHANT_NOT_FOUND'
    );
  }

  if (merchant.status !== 'ACTIVE') {
    await WebhookEvent.create({
      eventId: payload.eventId,
      gateway: payload.gateway,
      webhookHeaders: headers,
      rawPayload: payload,
      signature: signature || null,
      merchant: merchant._id,
      processingStatus: WEBHOOK_STATUS.FAILED,
      errorMessage: `Merchant '${merchant.merchantCode}' account is ${merchant.status}`,
    });

    throw new AppError(
      `Merchant '${merchant.merchantCode}' is currently ${merchant.status.toLowerCase()}. Cannot accept webhooks.`,
      403,
      'MERCHANT_INACTIVE'
    );
  }

  // 3. Verify Gateway is Enabled for Merchant
  const supportedGateways = merchant.configuration?.supportedGateways || [];
  if (!supportedGateways.includes(payload.gateway) && !isSimulated) {
    await WebhookEvent.create({
      eventId: payload.eventId,
      gateway: payload.gateway,
      webhookHeaders: headers,
      rawPayload: payload,
      signature: signature || null,
      merchant: merchant._id,
      processingStatus: WEBHOOK_STATUS.FAILED,
      errorMessage: `Gateway '${payload.gateway}' is not enabled for merchant '${merchant.merchantCode}'`,
    });

    throw new AppError(
      `Gateway '${payload.gateway}' is not configured for merchant '${merchant.merchantCode}'`,
      400,
      'GATEWAY_NOT_SUPPORTED'
    );
  }

  // 4. Signature Verification
  const webhookSecret = merchant.configuration?.webhookSecret;
  const isSignatureValid = verifyHmacSignature(payload, signature, webhookSecret, isSimulated);

  if (!isSignatureValid) {
    await WebhookEvent.create({
      eventId: payload.eventId,
      gateway: payload.gateway,
      webhookHeaders: headers,
      rawPayload: payload,
      signature: signature || null,
      merchant: merchant._id,
      processingStatus: WEBHOOK_STATUS.FAILED,
      errorMessage: 'Invalid webhook HMAC signature',
    });

    throw new AppError('Webhook signature verification failed', 401, 'INVALID_SIGNATURE');
  }

  // 5. Store / Update Raw WebhookEvent (Ingestion Buffer & Idempotency Check)
  let webhookEvent = await WebhookEvent.findOne({ eventId: payload.eventId });

  if (webhookEvent) {
    // If event was already completed, return idempotent response
    if (webhookEvent.processingStatus === WEBHOOK_STATUS.COMPLETED) {
      const existingPayment = webhookEvent.payment
        ? await Payment.findById(webhookEvent.payment)
        : await Payment.findOne({ idempotencyKey: payload.idempotencyKey });

      return {
        success: true,
        message: 'Webhook event already processed (idempotent replay)',
        eventId: payload.eventId,
        paymentId: existingPayment ? existingPayment.paymentId : payload.paymentId,
        status: existingPayment ? existingPayment.status : payload.status,
        isDuplicate: true,
        merchantCode: merchant.merchantCode,
      };
    }

    // Otherwise, mark as PROCESSING and increment retry count
    webhookEvent.processingStatus = WEBHOOK_STATUS.PROCESSING;
    webhookEvent.retryCount += 1;
    webhookEvent.errorMessage = null;
    await webhookEvent.save();
  } else {
    // Create new raw WebhookEvent buffer record
    webhookEvent = await WebhookEvent.create({
      eventId: payload.eventId,
      gateway: payload.gateway,
      webhookHeaders: headers,
      rawPayload: payload,
      signature: signature || null,
      receivedAt: new Date(),
      processingStatus: WEBHOOK_STATUS.PROCESSING,
      merchant: merchant._id,
    });
  }

  // Record Audit Log for Webhook Received
  await recordWebhookAudit({
    action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
    entityType: 'WebhookEvent',
    entityId: webhookEvent._id,
    requestContext,
    metadata: { gateway: payload.gateway, eventId: payload.eventId, merchantCode: merchant.merchantCode },
  });

  // 6. Payment Ledger Creation / Idempotent Lifecycle Update
  let payment = await Payment.findOne({ idempotencyKey: payload.idempotencyKey });

  if (payment) {
    // Existing payment found: check status transition
    const previousStatus = payment.status;

    if (payment.status !== payload.status) {
      payment.status = payload.status;
      if (payload.rawFailureReason) {
        payment.rawFailureReason = payload.rawFailureReason;
      }
      if (payload.processedAt) {
        payment.processedAt = new Date(payload.processedAt);
      }
      // Merge metadata
      payment.metadata = {
        ...(payment.metadata ? payment.metadata.toObject() : {}),
        ...(payload.metadata || {}),
      };
      payment.markModified('metadata');
      await payment.save();

      // Record Audit Log for Status Update
      await recordWebhookAudit({
        action: AUDIT_ACTIONS.PAYMENT_STATUS_UPDATE,
        entityType: 'Payment',
        entityId: payment._id,
        beforeSnapshot: { status: previousStatus },
        afterSnapshot: { status: payment.status },
        requestContext,
        metadata: { paymentId: payment.paymentId, from: previousStatus, to: payment.status },
      });
    }
  } else {
    // Structure metadata cleanly
    const structuredMetadata = {
      gatewayPayload: payload.metadata?.gatewayPayload || {},
      customerInfo: payload.metadata?.customerInfo || (payload.customerRef ? { customerId: payload.customerRef } : {}),
      deviceInfo: payload.metadata?.deviceInfo || {},
      networkInfo: payload.metadata?.networkInfo || {},
      custom: payload.metadata?.custom || {},
    };

    // Create Payment Ledger Record
    payment = await Payment.create({
      paymentId: payload.paymentId,
      merchant: merchant._id,
      gateway: payload.gateway,
      issuingBank: payload.issuingBank || 'UNKNOWN',
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      exchangeRate: payload.exchangeRate || 1.0,
      status: payload.status,
      rawFailureReason: payload.rawFailureReason || null,
      idempotencyKey: payload.idempotencyKey,
      gatewayEventId: payload.eventId,
      customerRef: payload.customerRef || null,
      metadata: structuredMetadata,
      processedAt: payload.processedAt ? new Date(payload.processedAt) : new Date(),
    });

    // Record Audit Log for Payment Created
    await recordWebhookAudit({
      action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
      entityType: 'Payment',
      entityId: payment._id,
      afterSnapshot: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      requestContext,
      metadata: { merchantCode: merchant.merchantCode, gateway: payment.gateway },
    });
  }

  // 7. Complete WebhookEvent Record
  webhookEvent.payment = payment._id;
  webhookEvent.processingStatus = WEBHOOK_STATUS.COMPLETED;
  await webhookEvent.save();

  // 8. Schedule Downstream Jobs in ProcessingQueue
  try {
    const queueJobs = [];

    // Job 1: If payment failed, schedule Classification Job
    if (payment.status === PAYMENT_STATUS.FAILED && payment.rawFailureReason) {
      queueJobs.push({
        payment: payment._id,
        jobType: QUEUE_JOB_TYPES.CLASSIFICATION,
        status: QUEUE_JOB_STATUS.PENDING,
        priority: 10,
        payload: {
          paymentId: payment._id,
          rawFailureReason: payment.rawFailureReason,
          gateway: payment.gateway,
          issuingBank: payment.issuingBank,
        },
      });
    }

    // Job 2: Schedule Analytics Aggregation Job
    queueJobs.push({
      payment: payment._id,
      jobType: QUEUE_JOB_TYPES.ANALYTICS,
      status: QUEUE_JOB_STATUS.PENDING,
      priority: 5,
      payload: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        merchantId: merchant._id,
      },
    });

    // Job 3: Schedule Webhook Merchant Notification Job
    queueJobs.push({
      payment: payment._id,
      jobType: QUEUE_JOB_TYPES.NOTIFICATION,
      status: QUEUE_JOB_STATUS.PENDING,
      priority: 1,
      payload: {
        paymentId: payment._id,
        event: `payment.${payment.status.toLowerCase()}`,
      },
    });

    await ProcessingQueue.insertMany(queueJobs);
  } catch (queueErr) {
    // If queue job creation fails, log it without failing the payment transaction
    logger.error(`Failed to schedule ProcessingQueue jobs for payment ${payment._id}: ${queueErr.message}`);
  }

  return {
    success: true,
    message: 'Webhook event processed successfully',
    eventId: payload.eventId,
    paymentId: payment.paymentId,
    status: payment.status,
    merchantCode: merchant.merchantCode,
  };
};

/**
 * Service: List raw WebhookEvents (Admin & Support Only)
 */
const listWebhookEvents = async ({ actorUser, query = {} }) => {
  const filter = {};

  if (actorUser.role === USER_ROLES.MERCHANT) {
    if (!actorUser.merchant) {
      throw new AppError('No merchant profile assigned to user', 403, 'MERCHANT_UNASSIGNED');
    }
    filter.merchant = actorUser.merchant;
  } else {
    if (query.merchantId) filter.merchant = query.merchantId;
    if (query.gateway) filter.gateway = query.gateway.toUpperCase();
    if (query.status) filter.processingStatus = query.status.toUpperCase();
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    WebhookEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('merchant', 'name merchantCode')
      .populate('payment', 'paymentId amount currency status')
      .lean(),
    WebhookEvent.countDocuments(filter),
  ]);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Service: Get single WebhookEvent by ID
 */
const getWebhookEventById = async (id, actorUser) => {
  const event = await WebhookEvent.findById(id)
    .populate('merchant', 'name merchantCode')
    .populate('payment', 'paymentId amount currency status rawFailureReason')
    .lean();

  if (!event) {
    throw new AppError(`WebhookEvent with ID '${id}' not found`, 404, 'WEBHOOK_EVENT_NOT_FOUND');
  }

  if (
    actorUser.role === USER_ROLES.MERCHANT &&
    actorUser.merchant &&
    event.merchant &&
    event.merchant._id.toString() !== actorUser.merchant.toString()
  ) {
    throw new AppError('Access denied: You can only view webhooks for your own merchant account', 403, 'TENANT_ACCESS_DENIED');
  }

  return event;
};

/**
 * Service: Replay a failed webhook event
 */
const replayWebhookEvent = async (id, actorUser, requestContext = {}) => {
  const event = await WebhookEvent.findById(id);

  if (!event) {
    throw new AppError(`WebhookEvent with ID '${id}' not found`, 404, 'WEBHOOK_EVENT_NOT_FOUND');
  }

  // Reprocess event
  const result = await processWebhookEvent({
    payload: event.rawPayload,
    headers: event.webhookHeaders || {},
    signature: event.signature,
    requestContext,
  });

  // Record Audit Log for Replay
  await recordWebhookAudit({
    action: AUDIT_ACTIONS.WEBHOOK_RETRY,
    entityType: 'WebhookEvent',
    entityId: event._id,
    actorUser,
    requestContext,
    metadata: { replayedBy: actorUser.email, eventId: event.eventId },
  });

  return result;
};

module.exports = {
  processWebhookEvent,
  listWebhookEvents,
  getWebhookEventById,
  replayWebhookEvent,
};
