const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analytics.service');

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Get top-level KPI metrics (volume, success rate, failures, merchants)
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getSummary = asyncHandler(async (req, res) => {
  const result = await analyticsService.getSummaryMetrics({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/payments-trend
 * @desc    Get time-series payments and failure volume trends
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getPaymentsTrend = asyncHandler(async (req, res) => {
  const result = await analyticsService.getPaymentsTrend({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/failures-by-category
 * @desc    Get breakdown of failure reasons by normalized classification category
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getFailuresByCategory = asyncHandler(async (req, res) => {
  const result = await analyticsService.getFailuresByCategory({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/failures-by-gateway
 * @desc    Get failure rate and volume breakdown by payment gateway
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getFailuresByGateway = asyncHandler(async (req, res) => {
  const result = await analyticsService.getFailuresByGateway({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/failures-by-bank
 * @desc    Get failure breakdown and volume by card issuing bank
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getFailuresByBank = asyncHandler(async (req, res) => {
  const result = await analyticsService.getFailuresByBank({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/merchant-performance
 * @desc    Get merchant-level volume, success rate, and failure stats
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getMerchantPerformance = asyncHandler(async (req, res) => {
  const result = await analyticsService.getMerchantPerformance({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/top-failure-reasons
 * @desc    Get top raw failure error messages and frequencies
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getTopFailureReasons = asyncHandler(async (req, res) => {
  const result = await analyticsService.getTopFailureReasons({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/queue-stats
 * @desc    Get background processing queue health telemetry
 * @access  Private (Admin, Support Only)
 */
const getQueueStats = asyncHandler(async (req, res) => {
  const result = await analyticsService.getQueueStats();

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/analytics/recent-activity
 * @desc    Get live stream of recent payment events
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  const result = await analyticsService.getRecentActivity({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getSummary,
  getPaymentsTrend,
  getFailuresByCategory,
  getFailuresByGateway,
  getFailuresByBank,
  getMerchantPerformance,
  getTopFailureReasons,
  getQueueStats,
  getRecentActivity,
};
