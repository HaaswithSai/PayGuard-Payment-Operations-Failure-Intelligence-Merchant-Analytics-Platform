const { FailureClassification, Payment, AuditLog } = require('../models');
const { classifyWithRules } = require('../utils/failureNormalization.utils');
const mlClientService = require('./mlClient.service');
const AppError = require('../utils/AppError');
const {
  FAILURE_SOURCES,
  FAILURE_CATEGORIES,
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  USER_ROLES,
} = require('../constants/enums');
const logger = require('../utils/logger');

/**
 * Service: Failure Classification Engine
 */
class ClassificationService {
  /**
   * Classify a payment failure and upsert FailureClassification record
   */
  async classifyPaymentFailure({ paymentId, actorUser = null, requestContext = {} }) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new AppError(`Payment with ID '${paymentId}' not found`, 404, 'PAYMENT_NOT_FOUND');
    }

    const rawFailureText = payment.rawFailureReason || payment.metadata?.gatewayPayload?.reason || 'UNKNOWN_DECLINE';

    // 1. Check if ML microservice is available
    let prediction = await mlClientService.predict({
      rawText: rawFailureText,
      gateway: payment.gateway,
      issuingBank: payment.issuingBank,
      metadata: payment.metadata,
    });

    // 2. Fall back to deterministic rule engine if ML is offline or returned low confidence
    if (!prediction || prediction.confidence < 0.7) {
      prediction = classifyWithRules({
        rawFailureReason: rawFailureText,
        gateway: payment.gateway,
        issuingBank: payment.issuingBank,
        metadata: payment.metadata,
      });
    }

    // 3. Upsert FailureClassification record (1:1 with Payment)
    const classification = await FailureClassification.findOneAndUpdate(
      { payment: payment._id },
      {
        $set: {
          rawText: rawFailureText,
          normalizedText: prediction.normalizedText,
          predictedCategory: prediction.predictedCategory,
          isoCode: prediction.isoCode,
          confidence: prediction.confidence,
          source: prediction.source,
          modelVersion: prediction.modelVersion,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // 4. Record Audit Log
    try {
      await AuditLog.create({
        actorUser: actorUser ? actorUser._id || actorUser.id : null,
        actorRole: actorUser ? actorUser.role : AUDIT_ACTOR_ROLES.SYSTEM,
        action: AUDIT_ACTIONS.FAILURE_CLASSIFIED,
        entityType: 'FailureClassification',
        entityId: classification._id.toString(),
        afterSnapshot: {
          paymentId: payment.paymentId,
          category: classification.predictedCategory,
          isoCode: classification.isoCode,
          confidence: classification.confidence,
          source: classification.source,
        },
        requestId: requestContext.requestId || null,
        correlationId: requestContext.correlationId || null,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        metadata: { paymentId: payment.paymentId, gateway: payment.gateway },
      });
    } catch (auditErr) {
      logger.error(`Failed to write classification audit log: ${auditErr.message}`);
    }

    return classification;
  }

  /**
   * Manual override of a failure classification by Admin / Support
   */
  async overrideClassification({ paymentId, predictedCategory, isoCode = null, actorUser, requestContext = {} }) {
    if (!Object.values(FAILURE_CATEGORIES).includes(predictedCategory)) {
      throw new AppError(`Invalid failure category: '${predictedCategory}'`, 400, 'INVALID_CATEGORY');
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError(`Payment with ID '${paymentId}' not found`, 404, 'PAYMENT_NOT_FOUND');
    }

    const existing = await FailureClassification.findOne({ payment: payment._id });
    const beforeSnapshot = existing ? existing.toJSON() : null;

    const classification = await FailureClassification.findOneAndUpdate(
      { payment: payment._id },
      {
        $set: {
          rawText: payment.rawFailureReason || 'MANUAL_OVERRIDE',
          predictedCategory,
          isoCode: isoCode || (existing ? existing.isoCode : null),
          confidence: 1.0,
          source: FAILURE_SOURCES.MANUAL,
          modelVersion: 'manual-review-v1',
          reviewedBy: actorUser._id,
          reviewedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Record Audit Log for Manual Override
    try {
      await AuditLog.create({
        actorUser: actorUser._id,
        actorRole: actorUser.role,
        action: AUDIT_ACTIONS.FAILURE_OVERRIDDEN,
        entityType: 'FailureClassification',
        entityId: classification._id.toString(),
        beforeSnapshot,
        afterSnapshot: classification.toJSON(),
        requestId: requestContext.requestId || null,
        correlationId: requestContext.correlationId || null,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        metadata: {
          overriddenBy: actorUser.email,
          paymentId: payment.paymentId,
          from: beforeSnapshot ? beforeSnapshot.predictedCategory : null,
          to: predictedCategory,
        },
      });
    } catch (auditErr) {
      logger.error(`Failed to write override audit log: ${auditErr.message}`);
    }

    return classification;
  }

  /**
   * List failure classifications with category and confidence filters
   */
  async listClassifications({ actorUser, query = {} }) {
    const filter = {};

    // Multi-tenant isolation: Scoped to logged-in merchant
    if (actorUser && actorUser.role === USER_ROLES.MERCHANT) {
      if (!actorUser.merchant) {
        return {
          classifications: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        };
      }
      const merchantPayments = await Payment.find({ merchant: actorUser.merchant }).select('_id');
      const paymentIds = merchantPayments.map((p) => p._id);
      filter.payment = { $in: paymentIds };
    } else if (query.merchantId) {
      const merchantPayments = await Payment.find({ merchant: query.merchantId }).select('_id');
      const paymentIds = merchantPayments.map((p) => p._id);
      filter.payment = { $in: paymentIds };
    }

    if (query.category) {
      filter.predictedCategory = query.category.toUpperCase();
    }
    if (query.source) {
      filter.source = query.source.toUpperCase();
    }
    if (query.isoCode) {
      filter.isoCode = query.isoCode.toUpperCase();
    }
    if (query.minConfidence) {
      filter.confidence = { $gte: parseFloat(query.minConfidence) };
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [classifications, total] = await Promise.all([
      FailureClassification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'payment',
          select: 'paymentId merchant gateway amount currency status rawFailureReason issuingBank',
          populate: { path: 'merchant', select: 'name merchantCode' },
        })
        .populate('reviewedBy', 'name email role')
        .lean(),
      FailureClassification.countDocuments(filter),
    ]);

    return {
      classifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get failure classification by Payment ID
   */
  async getClassificationByPaymentId(paymentId, actorUser) {
    const classification = await FailureClassification.findOne({ payment: paymentId })
      .populate({
        path: 'payment',
        select: 'paymentId merchant gateway amount currency status rawFailureReason issuingBank',
        populate: { path: 'merchant', select: 'name merchantCode' },
      })
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!classification) {
      throw new AppError(`Classification for payment '${paymentId}' not found`, 404, 'CLASSIFICATION_NOT_FOUND');
    }

    // Multi-tenant check
    if (actorUser && actorUser.role === USER_ROLES.MERCHANT) {
      const paymentMerchantId = classification.payment?.merchant?._id || classification.payment?.merchant;
      if (paymentMerchantId && paymentMerchantId.toString() !== actorUser.merchant.toString()) {
        throw new AppError('Unauthorized access to tenant classification', 403, 'FORBIDDEN');
      }
    }

    return classification;
  }
}

module.exports = new ClassificationService();
