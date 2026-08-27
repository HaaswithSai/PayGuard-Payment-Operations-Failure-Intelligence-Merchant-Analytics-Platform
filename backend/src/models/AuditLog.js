const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_ACTOR_ROLES } = require('../constants/enums');

/**
 * AuditLog Schema
 * Enterprise immutable audit log for compliance, traceability, security events,
 * and distributed request tracking (via requestId and correlationId).
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null for system/cron/automated worker actions
    },
    actorRole: {
      type: String,
      enum: {
        values: Object.values(AUDIT_ACTOR_ROLES),
        message: 'Invalid actor role: {VALUE}',
      },
      required: [true, 'Actor role is required'],
      default: AUDIT_ACTOR_ROLES.SYSTEM,
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      trim: true,
    },
    requestId: {
      type: String,
      default: null,
      trim: true,
    },
    correlationId: {
      type: String,
      default: null,
      trim: true,
    },
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Audit logs are strictly immutable once written
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// High-speed audit querying and distributed trace lookup indexes
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ correlationId: 1 }, { sparse: true });
auditLogSchema.index({ requestId: 1 }, { sparse: true });
auditLogSchema.index({ actorUser: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
