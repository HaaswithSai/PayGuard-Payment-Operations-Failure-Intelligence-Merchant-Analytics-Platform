const { Merchant, AuditLog } = require('../models');
const AppError = require('../utils/AppError');
const { AUDIT_ACTIONS, AUDIT_ACTOR_ROLES, USER_ROLES } = require('../constants/enums');
const logger = require('../utils/logger');

/**
 * Helper to record an audit log entry for merchant modifications
 */
const recordMerchantAudit = async ({
  actorUser,
  action,
  entityId,
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
      entityType: 'Merchant',
      entityId: entityId.toString(),
      beforeSnapshot,
      afterSnapshot,
      requestId: requestContext.requestId || null,
      correlationId: requestContext.correlationId || null,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      metadata,
    });
  } catch (err) {
    // Log audit failures without blocking the main transaction
    logger.error(`Failed to record audit log for merchant ${entityId}: ${err.message}`);
  }
};

/**
 * Service: Create a new merchant account
 */
const createMerchant = async (merchantData, actorUser, requestContext = {}) => {
  const { merchantCode, name, contactEmail, contactPhone, status, configuration } = merchantData;

  // 1. Check for duplicate merchant code
  const normalizedCode = merchantCode.trim().toUpperCase();
  const existingMerchant = await Merchant.findOne({ merchantCode: normalizedCode, isDeleted: false });

  if (existingMerchant) {
    throw new AppError(
      `Merchant with code '${normalizedCode}' already exists`,
      409,
      'DUPLICATE_MERCHANT_CODE'
    );
  }

  // 2. Instantiate and persist merchant
  const merchant = await Merchant.create({
    merchantCode: normalizedCode,
    name: name.trim(),
    contactEmail: contactEmail.toLowerCase().trim(),
    contactPhone: contactPhone ? contactPhone.trim() : null,
    status: status || undefined,
    configuration: configuration || undefined,
    createdBy: actorUser ? actorUser._id : null,
  });

  const merchantJson = merchant.toJSON();

  // 3. Record Audit Log
  await recordMerchantAudit({
    actorUser,
    action: AUDIT_ACTIONS.MERCHANT_CREATE,
    entityId: merchant._id,
    beforeSnapshot: null,
    afterSnapshot: merchantJson,
    requestContext,
    metadata: { merchantCode: normalizedCode },
  });

  return merchantJson;
};

/**
 * Service: List merchants with search, filters, pagination, and multi-tenant scoping
 */
const listMerchants = async ({ actorUser, query = {} }) => {
  const { role, merchant: userMerchantId } = actorUser;
  const filter = { isDeleted: false };

  // 1. Enforce Multi-Tenant Scoping for Merchant Users
  if (role === USER_ROLES.MERCHANT) {
    if (!userMerchantId) {
      throw new AppError('No merchant profile is associated with this account', 403, 'MERCHANT_UNASSIGNED');
    }
    filter._id = userMerchantId;
  } else {
    // Admin / Support filter options
    if (query.status) {
      filter.status = query.status;
    }
    if (query.gateway) {
      filter['configuration.supportedGateways'] = query.gateway.toUpperCase();
    }
    if (query.q) {
      const searchRegex = new RegExp(query.q.trim(), 'i');
      filter.$or = [
        { merchantCode: searchRegex },
        { name: searchRegex },
        { contactEmail: searchRegex },
      ];
    }
  }

  // 2. Pagination parameters
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 3. Sorting
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // 4. Query execution
  const [merchants, total] = await Promise.all([
    Merchant.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email role')
      .lean(),
    Merchant.countDocuments(filter),
  ]);

  return {
    merchants,
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
 * Service: Retrieve merchant by MongoDB ObjectId
 */
const getMerchantById = async (id, actorUser) => {
  const { role, merchant: userMerchantId } = actorUser;

  // Enforce tenant boundary
  if (role === USER_ROLES.MERCHANT && userMerchantId && userMerchantId.toString() !== id) {
    throw new AppError(
      'Access forbidden: You do not have permission to view another merchant profile.',
      403,
      'TENANT_ACCESS_DENIED'
    );
  }

  const merchant = await Merchant.findOne({ _id: id, isDeleted: false })
    .populate('createdBy', 'name email role')
    .lean();

  if (!merchant) {
    throw new AppError(`Merchant with ID '${id}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  return merchant;
};

/**
 * Service: Retrieve merchant by unique merchantCode
 */
const getMerchantByCode = async (merchantCode, actorUser) => {
  const normalizedCode = merchantCode.trim().toUpperCase();
  const merchant = await Merchant.findOne({ merchantCode: normalizedCode, isDeleted: false })
    .populate('createdBy', 'name email role')
    .lean();

  if (!merchant) {
    throw new AppError(`Merchant with code '${normalizedCode}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  // Enforce tenant boundary
  if (
    actorUser.role === USER_ROLES.MERCHANT &&
    actorUser.merchant &&
    actorUser.merchant.toString() !== merchant._id.toString()
  ) {
    throw new AppError(
      'Access forbidden: You do not have permission to view this merchant profile.',
      403,
      'TENANT_ACCESS_DENIED'
    );
  }

  return merchant;
};

/**
 * Service: Update general merchant details
 */
const updateMerchant = async (id, updateData, actorUser, requestContext = {}) => {
  const merchant = await Merchant.findOne({ _id: id, isDeleted: false });

  if (!merchant) {
    throw new AppError(`Merchant with ID '${id}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  const beforeSnapshot = merchant.toJSON();

  // Apply allowed field updates
  if (updateData.name !== undefined) merchant.name = updateData.name;
  if (updateData.contactEmail !== undefined) merchant.contactEmail = updateData.contactEmail;
  if (updateData.contactPhone !== undefined) merchant.contactPhone = updateData.contactPhone;
  if (updateData.status !== undefined) merchant.status = updateData.status;

  await merchant.save();
  const afterSnapshot = merchant.toJSON();

  // Record Audit Log
  await recordMerchantAudit({
    actorUser,
    action: AUDIT_ACTIONS.MERCHANT_UPDATE,
    entityId: merchant._id,
    beforeSnapshot,
    afterSnapshot,
    requestContext,
  });

  return afterSnapshot;
};

/**
 * Service: Partial update of merchant configuration
 */
const updateMerchantConfiguration = async (id, configUpdates, actorUser, requestContext = {}) => {
  const merchant = await Merchant.findOne({ _id: id, isDeleted: false });

  if (!merchant) {
    throw new AppError(`Merchant with ID '${id}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  const beforeSnapshot = merchant.toJSON();

  if (!merchant.configuration) {
    merchant.configuration = {};
  }

  // Update specific configuration properties without wiping others
  if (configUpdates.supportedGateways !== undefined) {
    merchant.configuration.supportedGateways = configUpdates.supportedGateways;
  }
  if (configUpdates.defaultCurrency !== undefined) {
    merchant.configuration.defaultCurrency = configUpdates.defaultCurrency;
  }
  if (configUpdates.webhookSecret !== undefined) {
    merchant.configuration.webhookSecret = configUpdates.webhookSecret;
  }
  if (configUpdates.retryPolicy !== undefined) {
    merchant.configuration.retryPolicy = {
      ...(merchant.configuration.retryPolicy ? merchant.configuration.retryPolicy.toObject() : {}),
      ...configUpdates.retryPolicy,
    };
  }
  if (configUpdates.customSettings !== undefined) {
    merchant.configuration.customSettings = {
      ...(merchant.configuration.customSettings || {}),
      ...configUpdates.customSettings,
    };
  }

  merchant.markModified('configuration');
  await merchant.save();
  const afterSnapshot = merchant.toJSON();

  // Record Audit Log
  await recordMerchantAudit({
    actorUser,
    action: AUDIT_ACTIONS.MERCHANT_CONFIG_UPDATE,
    entityId: merchant._id,
    beforeSnapshot,
    afterSnapshot,
    requestContext,
  });

  return afterSnapshot;
};

/**
 * Service: Update merchant status (Active / Inactive / Suspended)
 */
const updateMerchantStatus = async (id, status, actorUser, requestContext = {}) => {
  const merchant = await Merchant.findOne({ _id: id, isDeleted: false });

  if (!merchant) {
    throw new AppError(`Merchant with ID '${id}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  const beforeSnapshot = merchant.toJSON();
  merchant.status = status;
  await merchant.save();
  const afterSnapshot = merchant.toJSON();

  // Record Audit Log
  await recordMerchantAudit({
    actorUser,
    action: AUDIT_ACTIONS.MERCHANT_UPDATE,
    entityId: merchant._id,
    beforeSnapshot,
    afterSnapshot,
    requestContext,
    metadata: { statusChange: { from: beforeSnapshot.status, to: status } },
  });

  return afterSnapshot;
};

/**
 * Service: Soft delete merchant
 */
const deleteMerchant = async (id, actorUser, requestContext = {}) => {
  const merchant = await Merchant.findOne({ _id: id, isDeleted: false });

  if (!merchant) {
    throw new AppError(`Merchant with ID '${id}' not found`, 404, 'MERCHANT_NOT_FOUND');
  }

  const beforeSnapshot = merchant.toJSON();
  merchant.isDeleted = true;
  merchant.deletedAt = new Date();
  await merchant.save();

  // Record Audit Log
  await recordMerchantAudit({
    actorUser,
    action: 'MERCHANT_DELETED',
    entityId: merchant._id,
    beforeSnapshot,
    afterSnapshot: { isDeleted: true, deletedAt: merchant.deletedAt },
    requestContext,
  });

  return {
    success: true,
    message: `Merchant '${merchant.name}' (${merchant.merchantCode}) has been deactivated successfully`,
  };
};

module.exports = {
  createMerchant,
  listMerchants,
  getMerchantById,
  getMerchantByCode,
  updateMerchant,
  updateMerchantConfiguration,
  updateMerchantStatus,
  deleteMerchant,
};
