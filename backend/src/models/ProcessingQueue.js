const mongoose = require('mongoose');
const crypto = require('crypto');
const { QUEUE_JOB_TYPES, QUEUE_JOB_STATUS } = require('../constants/enums');

/**
 * ProcessingQueue Schema
 * Lightweight, production-style MongoDB-backed job queue for orchestrating
 * background workflows: Failure Classification (ML/Rules), Analytics Aggregation, and Webhook Notifications.
 */
const processingQueueSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: [true, 'Job ID is required'],
      unique: true,
      default: () => 'job_' + crypto.randomBytes(12).toString('hex'),
      trim: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required'],
      index: true,
    },
    jobType: {
      type: String,
      enum: {
        values: Object.values(QUEUE_JOB_TYPES),
        message: 'Invalid job type: {VALUE}',
      },
      required: [true, 'Job type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(QUEUE_JOB_STATUS),
        message: 'Invalid job status: {VALUE}',
      },
      default: QUEUE_JOB_STATUS.PENDING,
      required: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0, // Higher numbers process first
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [0, 'Max retries cannot be negative'],
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String,
      default: null,
      trim: true,
    },
    completedAt: {
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

// Worker polling index: efficiently fetch next pending jobs ordered by schedule and priority
processingQueueSchema.index({ status: 1, scheduledAt: 1, priority: -1 });

// Prevent duplicate pending jobs for the same payment and job type
processingQueueSchema.index({ payment: 1, jobType: 1 });
processingQueueSchema.index({ createdAt: -1 });

const ProcessingQueue = mongoose.model(
  'ProcessingQueue',
  processingQueueSchema
);

module.exports = ProcessingQueue;
