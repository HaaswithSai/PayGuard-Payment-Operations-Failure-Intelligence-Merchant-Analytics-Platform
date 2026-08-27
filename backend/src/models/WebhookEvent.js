const mongoose = require('mongoose');
const { WEBHOOK_STATUS, PAYMENT_GATEWAYS } = require('../constants/enums');

/**
 * WebhookEvent Schema
 * Immutable ingestion buffer that captures raw incoming gateway webhooks before processing.
 * Crucial for replayability, auditability, debugging, and non-repudiation.
 */
const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'Gateway event ID is required'],
      unique: true,
      trim: true,
    },
    gateway: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_GATEWAYS),
        message: 'Invalid gateway: {VALUE}',
      },
      required: [true, 'Gateway provider is required'],
    },
    webhookHeaders: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Raw webhook payload is required'],
    },
    signature: {
      type: String,
      default: null,
      trim: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processingStatus: {
      type: String,
      enum: {
        values: Object.values(WEBHOOK_STATUS),
        message: 'Invalid webhook processing status: {VALUE}',
      },
      default: WEBHOOK_STATUS.RECEIVED,
      required: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
webhookEventSchema.index({ processingStatus: 1, createdAt: -1 });
webhookEventSchema.index({ gateway: 1, processingStatus: 1 });
webhookEventSchema.index({ payment: 1 });
webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index(
  { receivedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days automatic lifecycle cleanup
);

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

module.exports = WebhookEvent;
