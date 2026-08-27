const mongoose = require('mongoose');
const { Payment, FailureClassification, Merchant, ProcessingQueue } = require('../models');
const { PAYMENT_STATUS, USER_ROLES } = require('../constants/enums');
const {
  parseDateRange,
  calculatePercentage,
  buildDateGroupFormat,
  resolveMerchantScope,
} = require('../utils/analytics.utils');

/**
 * Service: Analytics Aggregation Engine
 */
class AnalyticsService {
  /**
   * 1. Overview Summary Cards
   */
  async getSummaryMetrics({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);

    const matchFilter = {
      createdAt: { $gte: start, $lte: end },
    };

    if (merchantId) {
      matchFilter.merchant = merchantId;
    }
    if (query.gateway) {
      matchFilter.gateway = query.gateway.toUpperCase();
    }

    const [paymentAgg] = await Payment.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                totalVolume: { $sum: '$amount' },
                averageAmount: { $avg: '$amount' },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                volume: { $sum: '$amount' },
              },
            },
          ],
        },
      },
    ]);

    const overall = paymentAgg?.overall?.[0] || { totalPayments: 0, totalVolume: 0, averageAmount: 0 };
    const statusMap = (paymentAgg?.byStatus || []).reduce((acc, item) => {
      acc[item._id] = { count: item.count, volume: item.volume };
      return acc;
    }, {});

    const totalPayments = overall.totalPayments || 0;
    const successfulPayments = statusMap[PAYMENT_STATUS.SUCCESS]?.count || 0;
    const failedPayments = statusMap[PAYMENT_STATUS.FAILED]?.count || 0;
    const pendingPayments =
      (statusMap[PAYMENT_STATUS.PENDING]?.count || 0) + (statusMap[PAYMENT_STATUS.PROCESSING]?.count || 0);
    const refundedPayments = statusMap[PAYMENT_STATUS.REFUNDED]?.count || 0;
    const reversedPayments = statusMap[PAYMENT_STATUS.REVERSED]?.count || 0;

    const successRate = calculatePercentage(successfulPayments, totalPayments);
    const failureRate = calculatePercentage(failedPayments, totalPayments);

    // Operational Merchant & Queue Counts for Admin/Support
    let merchantStats = null;
    let queueStats = null;

    if (actorUser.role !== USER_ROLES.MERCHANT) {
      const [totalMerchants, activeMerchants, failedQueue, pendingQueue] = await Promise.all([
        Merchant.countDocuments({ isDeleted: false }),
        Merchant.countDocuments({ isDeleted: false, status: 'ACTIVE' }),
        ProcessingQueue.countDocuments({ status: 'FAILED' }),
        ProcessingQueue.countDocuments({ status: 'PENDING' }),
      ]);

      merchantStats = { total: totalMerchants, active: activeMerchants };
      queueStats = { pending: pendingQueue, failed: failedQueue };
    }

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      metrics: {
        totalPayments,
        successfulPayments,
        failedPayments,
        pendingPayments,
        refundedPayments,
        reversedPayments,
        successRate,
        failureRate,
        totalVolume: parseFloat((overall.totalVolume || 0).toFixed(2)),
        averageAmount: parseFloat((overall.averageAmount || 0).toFixed(2)),
      },
      merchants: merchantStats,
      queue: queueStats,
    };
  }

  /**
   * 2. Time-Series Trend Analytics
   */
  async getPaymentsTrend({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);
    const dateFormat = buildDateGroupFormat(query.groupBy || 'day');

    const matchFilter = {
      createdAt: { $gte: start, $lte: end },
    };

    if (merchantId) matchFilter.merchant = merchantId;
    if (query.gateway) matchFilter.gateway = query.gateway.toUpperCase();

    const trend = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalPayments: { $sum: 1 },
          totalVolume: { $sum: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCESS] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, 1, 0] },
          },
          successfulVolume: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCESS] }, '$amount', 0] },
          },
          failedVolume: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, '$amount', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalPayments: 1,
          totalVolume: { $round: ['$totalVolume', 2] },
          successfulPayments: 1,
          failedPayments: 1,
          successfulVolume: { $round: ['$successfulVolume', 2] },
          failedVolume: { $round: ['$failedVolume', 2] },
        },
      },
    ]);

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      groupBy: query.groupBy || 'day',
      trend,
    };
  }

  /**
   * 3. Failures Breakdown by Category
   */
  async getFailuresByCategory({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);

    const matchFilter = {
      status: PAYMENT_STATUS.FAILED,
      createdAt: { $gte: start, $lte: end },
    };
    if (merchantId) matchFilter.merchant = merchantId;
    if (query.gateway) matchFilter.gateway = query.gateway.toUpperCase();

    const categories = await Payment.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'failureclassifications',
          localField: '_id',
          foreignField: 'payment',
          as: 'classification',
        },
      },
      {
        $unwind: {
          path: '$classification',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$classification.predictedCategory', 'UNCLASSIFIED'] },
          count: { $sum: 1 },
          failedVolume: { $sum: '$amount' },
          avgConfidence: { $avg: '$classification.confidence' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalFailed = categories.reduce((sum, item) => sum + item.count, 0);

    const breakdown = categories.map((cat) => ({
      category: cat._id,
      count: cat.count,
      percentage: calculatePercentage(cat.count, totalFailed),
      failedVolume: parseFloat((cat.failedVolume || 0).toFixed(2)),
      avgConfidence: cat.avgConfidence ? parseFloat(cat.avgConfidence.toFixed(2)) : null,
    }));

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      totalFailed,
      breakdown,
    };
  }

  /**
   * 4. Failures Breakdown by Gateway
   */
  async getFailuresByGateway({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);

    const matchFilter = {
      createdAt: { $gte: start, $lte: end },
    };
    if (merchantId) matchFilter.merchant = merchantId;

    const gatewayStats = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$gateway',
          totalPayments: { $sum: 1 },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCESS] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, 1, 0] },
          },
          totalVolume: { $sum: '$amount' },
          failedVolume: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, '$amount', 0] },
          },
        },
      },
      { $sort: { totalPayments: -1 } },
    ]);

    const result = gatewayStats.map((gw) => ({
      gateway: gw._id,
      totalPayments: gw.totalPayments,
      successfulPayments: gw.successfulPayments,
      failedPayments: gw.failedPayments,
      successRate: calculatePercentage(gw.successfulPayments, gw.totalPayments),
      failureRate: calculatePercentage(gw.failedPayments, gw.totalPayments),
      totalVolume: parseFloat((gw.totalVolume || 0).toFixed(2)),
      failedVolume: parseFloat((gw.failedVolume || 0).toFixed(2)),
    }));

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      gateways: result,
    };
  }

  /**
   * 5. Failures Breakdown by Issuing Bank
   */
  async getFailuresByBank({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);

    const matchFilter = {
      status: PAYMENT_STATUS.FAILED,
      createdAt: { $gte: start, $lte: end },
    };
    if (merchantId) matchFilter.merchant = merchantId;
    if (query.gateway) matchFilter.gateway = query.gateway.toUpperCase();

    const limit = Math.min(50, parseInt(query.limit, 10) || 10);

    const bankFailures = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $ifNull: ['$issuingBank', 'UNKNOWN_BANK'] },
          failedCount: { $sum: 1 },
          failedVolume: { $sum: '$amount' },
        },
      },
      { $sort: { failedCount: -1 } },
      { $limit: limit },
    ]);

    const totalBankFailures = bankFailures.reduce((sum, item) => sum + item.failedCount, 0);

    const banks = bankFailures.map((b) => ({
      bankName: b._id,
      failedCount: b.failedCount,
      percentage: calculatePercentage(b.failedCount, totalBankFailures),
      failedVolume: parseFloat((b.failedVolume || 0).toFixed(2)),
    }));

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      totalFailuresAnalyzed: totalBankFailures,
      banks,
    };
  }

  /**
   * 6. Merchant Performance Comparison (Admin / Support Global or Single Merchant Scoped)
   */
  async getMerchantPerformance({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);

    const matchFilter = {
      createdAt: { $gte: start, $lte: end },
    };
    if (merchantId) matchFilter.merchant = merchantId;

    const merchants = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$merchant',
          totalPayments: { $sum: 1 },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCESS] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, 1, 0] },
          },
          totalVolume: { $sum: '$amount' },
        },
      },
      {
        $lookup: {
          from: 'merchants',
          localField: '_id',
          foreignField: '_id',
          as: 'merchantInfo',
        },
      },
      {
        $unwind: {
          path: '$merchantInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          merchantCode: '$merchantInfo.merchantCode',
          merchantName: '$merchantInfo.name',
          totalPayments: 1,
          successfulPayments: 1,
          failedPayments: 1,
          totalVolume: { $round: ['$totalVolume', 2] },
        },
      },
      { $sort: { totalVolume: -1 } },
    ]);

    const result = merchants.map((m) => ({
      merchantId: m._id,
      merchantCode: m.merchantCode || 'N/A',
      name: m.merchantName || 'Unknown Merchant',
      totalPayments: m.totalPayments,
      successfulPayments: m.successfulPayments,
      failedPayments: m.failedPayments,
      successRate: calculatePercentage(m.successfulPayments, m.totalPayments),
      failureRate: calculatePercentage(m.failedPayments, m.totalPayments),
      totalVolume: m.totalVolume,
    }));

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      merchants: result,
    };
  }

  /**
   * 7. Top Failure Reasons
   */
  async getTopFailureReasons({ actorUser, query = {} }) {
    const { start, end } = parseDateRange(query);
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);
    const limit = Math.min(50, parseInt(query.limit, 10) || 10);

    const matchFilter = {
      status: PAYMENT_STATUS.FAILED,
      createdAt: { $gte: start, $lte: end },
    };
    if (merchantId) matchFilter.merchant = merchantId;
    if (query.gateway) matchFilter.gateway = query.gateway.toUpperCase();

    const reasons = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $ifNull: ['$rawFailureReason', 'UNSPECIFIED_DECLINE'] },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const totalFailed = reasons.reduce((sum, r) => sum + r.count, 0);

    const result = reasons.map((r) => ({
      rawReason: r._id,
      count: r.count,
      percentage: calculatePercentage(r.count, totalFailed),
      totalAmount: parseFloat((r.totalAmount || 0).toFixed(2)),
    }));

    return {
      timeframe: { startDate: start.toISOString(), endDate: end.toISOString() },
      totalFailed,
      reasons: result,
    };
  }

  /**
   * 8. Queue Processing Health Telemetry
   */
  async getQueueStats() {
    const [byStatus, byJobType] = await Promise.all([
      ProcessingQueue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgRetries: { $avg: '$retryCount' },
          },
        },
      ]),
      ProcessingQueue.aggregate([
        {
          $group: {
            _id: '$jobType',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const jobTypeCounts = byJobType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      statusOverview: {
        pending: statusCounts.PENDING || 0,
        processing: statusCounts.PROCESSING || 0,
        completed: statusCounts.COMPLETED || 0,
        failed: statusCounts.FAILED || 0,
      },
      jobTypes: jobTypeCounts,
    };
  }

  /**
   * 9. Live Recent Activity Stream
   */
  async getRecentActivity({ actorUser, query = {} }) {
    const merchantId = resolveMerchantScope(actorUser, query.merchantId);
    const filter = {};
    if (merchantId) filter.merchant = merchantId;

    const limit = Math.min(50, parseInt(query.limit, 10) || 15);

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('merchant', 'name merchantCode')
      .lean();

    return {
      count: payments.length,
      activity: payments.map((p) => ({
        id: p._id,
        paymentId: p.paymentId,
        merchantCode: p.merchant?.merchantCode || 'N/A',
        merchantName: p.merchant?.name || 'N/A',
        gateway: p.gateway,
        issuingBank: p.issuingBank,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        rawFailureReason: p.rawFailureReason,
        processedAt: p.processedAt || p.createdAt,
      })),
    };
  }
}

module.exports = new AnalyticsService();
