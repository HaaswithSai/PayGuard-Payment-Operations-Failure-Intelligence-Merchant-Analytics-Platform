const mongoose = require('mongoose');
const {
  REPORT_TYPES,
  REPORT_FORMATS,
  REPORT_STATUS,
  STORAGE_TYPES,
} = require('../constants/enums');

/**
 * Report Schema
 * Manages generated asynchronous operational reports, data exports, and audit exports.
 * Uses storage-agnostic location fields for seamless migration from local filesystem to S3/GCS.
 */
const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: {
        values: Object.values(REPORT_TYPES),
        message: 'Invalid report type: {VALUE}',
      },
      required: [true, 'Report type is required'],
      index: true,
    },
    filtersUsed: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who initiated report is required'],
      index: true,
    },
    storageType: {
      type: String,
      enum: {
        values: Object.values(STORAGE_TYPES),
        message: 'Invalid storage provider: {VALUE}',
      },
      default: STORAGE_TYPES.LOCAL,
      required: true,
    },
    fileLocation: {
      type: String,
      default: null,
      trim: true, // Stores relative path or s3://... / https://... URI
    },
    format: {
      type: String,
      enum: {
        values: Object.values(REPORT_FORMATS),
        message: 'Invalid report format: {VALUE}',
      },
      default: REPORT_FORMATS.CSV,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(REPORT_STATUS),
        message: 'Invalid report status: {VALUE}',
      },
      default: REPORT_STATUS.PENDING,
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      default: null,
      min: 0,
    },
    rowCount: {
      type: Number,
      default: null,
      min: 0,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null, // For automatic cleanup / S3 lifecycle policies
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, createdAt: -1 });
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true }); // Optional TTL auto-cleanup

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
