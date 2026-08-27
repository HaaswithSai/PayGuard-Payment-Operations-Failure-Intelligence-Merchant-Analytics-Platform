const asyncHandler = require('../utils/asyncHandler');
const merchantService = require('../services/merchant.service');

/**
 * Extract request tracing headers for audit logging
 */
const getRequestContext = (req) => ({
  requestId: req.headers['x-request-id'] || null,
  correlationId: req.headers['x-correlation-id'] || null,
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent'] || null,
});

/**
 * @route   POST /api/v1/merchants
 * @desc    Create a new merchant account
 * @access  Private (Admin Only)
 */
const createMerchant = asyncHandler(async (req, res) => {
  const merchant = await merchantService.createMerchant(
    req.body,
    req.user,
    getRequestContext(req)
  );

  res.status(201).json({
    success: true,
    message: 'Merchant account created successfully',
    merchant,
  });
});

/**
 * @route   GET /api/v1/merchants
 * @desc    List merchants (Paginated & Filtered for Admin/Support; Scoped for Merchant)
 * @access  Private (Admin, Support, Merchant)
 */
const listMerchants = asyncHandler(async (req, res) => {
  const result = await merchantService.listMerchants({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.merchants.length,
    pagination: result.pagination,
    merchants: result.merchants,
  });
});

/**
 * @route   GET /api/v1/merchants/:id
 * @desc    Get merchant profile by ID
 * @access  Private (Admin, Support, Merchant [self only])
 */
const getMerchantById = asyncHandler(async (req, res) => {
  const merchant = await merchantService.getMerchantById(req.params.id, req.user);

  res.status(200).json({
    success: true,
    merchant,
  });
});

/**
 * @route   GET /api/v1/merchants/code/:merchantCode
 * @desc    Get merchant profile by unique merchantCode
 * @access  Private (Admin, Support, Merchant [self only])
 */
const getMerchantByCode = asyncHandler(async (req, res) => {
  const merchant = await merchantService.getMerchantByCode(req.params.merchantCode, req.user);

  res.status(200).json({
    success: true,
    merchant,
  });
});

/**
 * @route   PATCH /api/v1/merchants/:id
 * @desc    Update general merchant information
 * @access  Private (Admin Only)
 */
const updateMerchant = asyncHandler(async (req, res) => {
  const merchant = await merchantService.updateMerchant(
    req.params.id,
    req.body,
    req.user,
    getRequestContext(req)
  );

  res.status(200).json({
    success: true,
    message: 'Merchant details updated successfully',
    merchant,
  });
});

/**
 * @route   PATCH /api/v1/merchants/:id/configuration
 * @desc    Partially update merchant gateway configuration & policies
 * @access  Private (Admin Only)
 */
const updateConfiguration = asyncHandler(async (req, res) => {
  const merchant = await merchantService.updateMerchantConfiguration(
    req.params.id,
    req.body,
    req.user,
    getRequestContext(req)
  );

  res.status(200).json({
    success: true,
    message: 'Merchant configuration updated successfully',
    merchant,
  });
});

/**
 * @route   PATCH /api/v1/merchants/:id/status
 * @desc    Update merchant status (ACTIVE, INACTIVE, SUSPENDED)
 * @access  Private (Admin Only)
 */
const updateStatus = asyncHandler(async (req, res) => {
  const merchant = await merchantService.updateMerchantStatus(
    req.params.id,
    req.body.status,
    req.user,
    getRequestContext(req)
  );

  res.status(200).json({
    success: true,
    message: `Merchant status updated to '${merchant.status}' successfully`,
    merchant,
  });
});

/**
 * @route   DELETE /api/v1/merchants/:id
 * @desc    Deactivate (Soft-Delete) merchant account
 * @access  Private (Admin Only)
 */
const deleteMerchant = asyncHandler(async (req, res) => {
  const result = await merchantService.deleteMerchant(
    req.params.id,
    req.user,
    getRequestContext(req)
  );

  res.status(200).json(result);
});

module.exports = {
  createMerchant,
  listMerchants,
  getMerchantById,
  getMerchantByCode,
  updateMerchant,
  updateConfiguration,
  updateStatus,
  deleteMerchant,
};
