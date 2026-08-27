const mongoose = require('mongoose');
const { USER_ROLES } = require('../constants/enums');
const AppError = require('./AppError');

/**
 * Parse date range query parameters into Date boundaries
 * @param {object} params
 * @param {string} [params.startDate] - ISO Date string
 * @param {string} [params.endDate] - ISO Date string
 * @param {number} [params.defaultDays=30] - Fallback window
 * @returns {{ start: Date, end: Date }}
 */
const parseDateRange = ({ startDate, endDate, defaultDays = 30 } = {}) => {
  let end = endDate ? new Date(endDate) : new Date();
  if (isNaN(end.getTime())) {
    end = new Date();
  }
  end.setUTCHours(23, 59, 59, 999);

  let start = startDate ? new Date(startDate) : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  if (isNaN(start.getTime())) {
    start = new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  }
  start.setUTCHours(0, 0, 0, 0);

  if (start > end) {
    start = new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);
  }

  return { start, end };
};

/**
 * Calculate rate or percentage safely without NaN/Infinity
 */
const calculatePercentage = (count, total, decimals = 2) => {
  if (!total || total <= 0 || !count || count <= 0) return 0;
  const rate = (count / total) * 100;
  return parseFloat(rate.toFixed(decimals));
};

/**
 * Build MongoDB $dateToString format specifier based on groupBy parameter
 */
const buildDateGroupFormat = (groupBy = 'day') => {
  switch (groupBy.toLowerCase()) {
    case 'hour':
      return '%Y-%m-%d %H:00';
    case 'week':
      return '%Y-W%V';
    case 'month':
      return '%Y-%m';
    case 'day':
    default:
      return '%Y-%m-%d';
  }
};

/**
 * Enforce multi-tenant scoping for queries
 * Returns MongoDB ObjectId or null
 */
const resolveMerchantScope = (actorUser, queryMerchantId = null) => {
  if (!actorUser) return null;

  // Merchant role is strictly scoped to their assigned merchant
  if (actorUser.role === USER_ROLES.MERCHANT) {
    if (!actorUser.merchant) {
      throw new AppError('No merchant profile assigned to user account', 403, 'MERCHANT_UNASSIGNED');
    }
    return new mongoose.Types.ObjectId(actorUser.merchant);
  }

  // Admin / Support can filter by merchantId if provided
  if (queryMerchantId) {
    if (!mongoose.Types.ObjectId.isValid(queryMerchantId)) {
      throw new AppError(`Invalid merchant ID filter: '${queryMerchantId}'`, 400, 'INVALID_ID_FORMAT');
    }
    return new mongoose.Types.ObjectId(queryMerchantId);
  }

  return null;
};

module.exports = {
  parseDateRange,
  calculatePercentage,
  buildDateGroupFormat,
  resolveMerchantScope,
};
