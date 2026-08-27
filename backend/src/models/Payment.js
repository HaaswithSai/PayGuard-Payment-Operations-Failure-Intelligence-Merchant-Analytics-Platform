const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_GATEWAYS } = require('../constants/enums');

/**
 * Customer Info Sub-schema
 */
const customerInfoSchema = new mongoose.Schema(
  {
    customerId: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    name: { type: String, trim: true, default: null },
    ipAddress: { type: String, trim: true, default: null },
  },
  { _id: false }
);

/**
 * Device Info Sub-schema
 */
const deviceInfoSchema = new mongoose.Schema(
  {
    userAgent: { type: String, trim: true, default: null },
    platform: { type: String, trim: true, default: null },
    deviceFingerprint: { type: String, trim: true, default: null },
    ip: { type: String, trim: true, default: null },
  },
  { _id: false }
);

/**
 * Network / Card Info Sub-schema
 */
const networkInfoSchema = new mongoose.Schema(
  {
    routingNumber: { type: String, trim: true, default: null },
    rrn: { type: String, trim: true, default: null }, // Retrieval Reference Number
    arn: { type: String, trim: true, default: null }, // Acquirer Reference Number
    bin: { type: String, trim: true, default: null }, // Bank Identification Number (first 6-8 digits)
    cardBrand: { type: String, trim: true, default: null }, // VISA, MASTERCARD, AMEX, etc.
    cardType: { type: String, trim: true, default: null }, // CREDIT, DEBIT, PREPAID
    cardLast4: { type: String, trim: true, default: null },
  },
  { _id: false }
);

/**
 * Structured Payment Metadata Schema
 */
const paymentMetadataSchema = new mongoose.Schema(
  {
    gatewayPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    customerInfo: {
      type: customerInfoSchema,
      default: () => ({}),
    },
    deviceInfo: {
      type: deviceInfoSchema,
      default: () => ({}),
    },
    networkInfo: {
      type: networkInfoSchema,
      default: () => ({}),
    },
    custom: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

/**
 * Payment Schema
 * Core transaction ledger record. Stores clean financial and gateway execution states.
 * Normalized failure classifications are decoupled and stored in FailureClassification.
 */
const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: [true, 'Payment ID / Transaction ID is required'],
      unique: true,
      trim: true,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant reference is required'],
      index: true,
    },
    gateway: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_GATEWAYS),
        message: 'Invalid payment gateway: {VALUE}',
      },
      required: [true, 'Payment gateway is required'],
    },
    issuingBank: {
      type: String,
      trim: true,
      default: 'UNKNOWN',
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency code must be exactly 3 characters'],
      maxlength: [3, 'Currency code must be exactly 3 characters'],
    },
    exchangeRate: {
      type: Number,
      default: 1.0,
      min: [0, 'Exchange rate cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_STATUS),
        message: 'Invalid payment status: {VALUE}',
      },
      required: [true, 'Payment status is required'],
      default: PAYMENT_STATUS.PENDING,
    },
    rawFailureReason: {
      type: String,
      default: null,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      trim: true,
    },
    gatewayEventId: {
      type: String,
      default: null,
      trim: true,
    },
    customerRef: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: paymentMetadataSchema,
      default: () => ({}),
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual relationship to 1:1 FailureClassification
paymentSchema.virtual('classification', {
  ref: 'FailureClassification',
  localField: '_id',
  foreignField: 'payment',
  justOne: true,
});

// High-performance Compound Indexes for Dashboard Analytics and Gateway Ingestion
paymentSchema.index({ merchant: 1, status: 1, createdAt: -1 });
paymentSchema.index({ gateway: 1, createdAt: -1 });
paymentSchema.index({ issuingBank: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ gatewayEventId: 1 }, { sparse: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
