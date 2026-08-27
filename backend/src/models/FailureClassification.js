const mongoose = require('mongoose');
const { FAILURE_SOURCES, FAILURE_CATEGORIES } = require('../constants/enums');

/**
 * FailureClassification Schema
 * Stores normalized failure classification, ISO 8583 response codes, ML confidence scores,
 * and review history. Maintains a 1:1 relationship with failed Payments.
 */
const failureClassificationSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required'],
      unique: true, // Guarantees 1:1 relationship
      index: true,
    },
    rawText: {
      type: String,
      required: [true, 'Raw failure text is required'],
      trim: true,
    },
    normalizedText: {
      type: String,
      trim: true,
      default: '',
    },
    predictedCategory: {
      type: String,
      enum: {
        values: Object.values(FAILURE_CATEGORIES),
        message: 'Invalid failure category: {VALUE}',
      },
      required: [true, 'Predicted failure category is required'],
    },
    isoCode: {
      type: String,
      trim: true,
      default: null, // e.g., '51' (Insufficient funds), '05' (Do not honor), '54' (Expired card)
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence score is required'],
      min: [0, 'Confidence cannot be less than 0.0'],
      max: [1, 'Confidence cannot exceed 1.0'],
      default: 1.0,
    },
    source: {
      type: String,
      enum: {
        values: Object.values(FAILURE_SOURCES),
        message: 'Invalid classification source: {VALUE}',
      },
      required: [true, 'Classification source is required'],
      default: FAILURE_SOURCES.RULE_BASED,
    },
    modelVersion: {
      type: String,
      trim: true,
      default: 'rule-engine-v1',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
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

// Indexes for ML evaluation, manual review queues, and category aggregation
failureClassificationSchema.index({ predictedCategory: 1, createdAt: -1 });
failureClassificationSchema.index({ source: 1, confidence: 1 });
failureClassificationSchema.index({ isoCode: 1 });
failureClassificationSchema.index({ createdAt: -1 });

const FailureClassification = mongoose.model(
  'FailureClassification',
  failureClassificationSchema
);

module.exports = FailureClassification;
