const mongoose = require('mongoose');
const { MERCHANT_STATUS, PAYMENT_GATEWAYS } = require('../constants/enums');

/**
 * Retry Policy Sub-schema
 * Configures exponential retry rules per merchant gateway interactions.
 */
const retryPolicySchema = new mongoose.Schema(
  {
    maxRetries: {
      type: Number,
      default: 3,
      min: [0, 'Max retries cannot be negative'],
      max: [10, 'Max retries cannot exceed 10'],
    },
    backoffFactorMs: {
      type: Number,
      default: 1000,
      min: [100, 'Backoff factor must be at least 100ms'],
    },
    timeoutMs: {
      type: Number,
      default: 5000,
      min: [500, 'Timeout must be at least 500ms'],
    },
  },
  { _id: false }
);

/**
 * Merchant Configuration Sub-schema
 * Extensible configuration container for gateway settings, default currencies, secrets, and retry rules.
 */
const merchantConfigSchema = new mongoose.Schema(
  {
    supportedGateways: {
      type: [
        {
          type: String,
          enum: {
            values: Object.values(PAYMENT_GATEWAYS),
            message: 'Invalid gateway: {VALUE}',
          },
        },
      ],
      default: [PAYMENT_GATEWAYS.STRIPE],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A merchant must have at least one supported gateway',
      },
    },
    defaultCurrency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency code must be exactly 3 characters'],
      maxlength: [3, 'Currency code must be exactly 3 characters'],
    },
    webhookSecret: {
      type: String,
      default: null,
      trim: true,
    },
    retryPolicy: {
      type: retryPolicySchema,
      default: () => ({}),
    },
    customSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

/**
 * Merchant Schema
 * Represents enterprise tenants/companies processing payments through PayGuard.
 */
const merchantSchema = new mongoose.Schema(
  {
    merchantCode: {
      type: String,
      required: [true, 'Merchant code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9_-]{3,50}$/,
        'Merchant code must be 3-50 alphanumeric characters (hyphen/underscore allowed)',
      ],
    },
    name: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
      minlength: [2, 'Merchant name must be at least 2 characters long'],
      maxlength: [150, 'Merchant name cannot exceed 150 characters'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid contact email address',
      ],
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(MERCHANT_STATUS),
        message: 'Invalid merchant status: {VALUE}',
      },
      required: [true, 'Merchant status is required'],
      default: MERCHANT_STATUS.ACTIVE,
    },
    configuration: {
      type: merchantConfigSchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
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

// Indexes for high-throughput searching and dashboard filtering
merchantSchema.index({ status: 1 });
merchantSchema.index({ name: 1 });
merchantSchema.index({ createdAt: -1 });

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;
