const { Payment, FailureClassification, Merchant, AuditLog } = require('../models');
const { REPORT_TYPES, PAYMENT_STATUS } = require('../constants/enums');
const { parseDateRange, calculatePercentage } = require('../utils/analytics.utils');
const { jsonToCsv } = require('../utils/csv.utils');
const { jsonToExcelXml } = require('../utils/xlsx.utils');
const AppError = require('../utils/AppError');

/**
 * Service: Report Data Aggregator and Format Serializer
 */
class ReportBuilderService {
  /**
   * Fetch data and generate serialized report file content
   * @param {object} params
   * @param {string} params.reportType
   * @param {string} params.format (CSV or XLSX)
   * @param {object} params.filtersUsed
   * @param {object} params.actorUser
   * @returns {Promise<{ content: string, rowCount: number, filename: string }>}
   */
  async buildReport({ reportType, format, filtersUsed = {}, actorUser }) {
    const { start, end } = parseDateRange(filtersUsed);
    let rows = [];
    let columns = [];
    let title = 'PayGuard_Report';

    switch (reportType) {
      case REPORT_TYPES.TRANSACTION_SUMMARY: {
        const result = await this.buildTransactionSummary(filtersUsed, start, end);
        rows = result.rows;
        columns = result.columns;
        title = 'Transaction_Summary';
        break;
      }

      case REPORT_TYPES.FAILURE_ANALYSIS: {
        const result = await this.buildFailureAnalysis(filtersUsed, start, end);
        rows = result.rows;
        columns = result.columns;
        title = 'Failure_Analysis';
        break;
      }

      case REPORT_TYPES.MERCHANT_RECONCILIATION: {
        const result = await this.buildMerchantReconciliation(filtersUsed, start, end);
        rows = result.rows;
        columns = result.columns;
        title = 'Merchant_Reconciliation';
        break;
      }

      case REPORT_TYPES.GATEWAY_PERFORMANCE: {
        const result = await this.buildGatewayPerformance(filtersUsed, start, end);
        rows = result.rows;
        columns = result.columns;
        title = 'Gateway_Performance';
        break;
      }

      case REPORT_TYPES.AUDIT_TRAIL: {
        const result = await this.buildAuditTrail(filtersUsed, start, end);
        rows = result.rows;
        columns = result.columns;
        title = 'Audit_Trail';
        break;
      }

      default:
        throw new AppError(`Unsupported report type: '${reportType}'`, 400, 'INVALID_REPORT_TYPE');
    }

    // Serialize to requested format
    let content = '';
    const ext = format === 'XLSX' ? 'xlsx' : 'csv';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${title}_${timestamp}.${ext}`;

    if (format === 'XLSX') {
      content = jsonToExcelXml(rows, columns, title.replace(/_/g, ' '));
    } else {
      content = jsonToCsv(rows, columns);
    }

    return {
      content,
      rowCount: rows.length,
      filename,
    };
  }

  // 1. Transaction Summary Report Builder
  async buildTransactionSummary(filters, start, end) {
    const query = { createdAt: { $gte: start, $lte: end } };
    if (filters.merchantId) query.merchant = filters.merchantId;
    if (filters.gateway) query.gateway = filters.gateway.toUpperCase();
    if (filters.status) query.status = filters.status.toUpperCase();

    const limit = Math.min(10000, parseInt(filters.limit, 10) || 5000);

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('merchant', 'merchantCode name')
      .lean();

    const rows = payments.map((p) => ({
      paymentId: p.paymentId,
      merchantCode: p.merchant?.merchantCode || 'N/A',
      merchantName: p.merchant?.name || 'N/A',
      gateway: p.gateway,
      issuingBank: p.issuingBank || 'UNKNOWN',
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      customerRef: p.customerRef || 'N/A',
      processedAt: p.processedAt ? p.processedAt.toISOString() : p.createdAt.toISOString(),
    }));

    const columns = [
      { key: 'paymentId', header: 'Payment ID' },
      { key: 'merchantCode', header: 'Merchant Code' },
      { key: 'merchantName', header: 'Merchant Name' },
      { key: 'gateway', header: 'Gateway' },
      { key: 'issuingBank', header: 'Issuing Bank' },
      { key: 'amount', header: 'Amount' },
      { key: 'currency', header: 'Currency' },
      { key: 'status', header: 'Status' },
      { key: 'customerRef', header: 'Customer Ref' },
      { key: 'processedAt', header: 'Processed Date' },
    ];

    return { rows, columns };
  }

  // 2. Failure Analysis Report Builder
  async buildFailureAnalysis(filters, start, end) {
    const match = {
      status: PAYMENT_STATUS.FAILED,
      createdAt: { $gte: start, $lte: end },
    };
    if (filters.merchantId) match.merchant = filters.merchantId;
    if (filters.gateway) match.gateway = filters.gateway.toUpperCase();

    const limit = Math.min(10000, parseInt(filters.limit, 10) || 5000);

    const payments = await Payment.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'merchants',
          localField: 'merchant',
          foreignField: '_id',
          as: 'merchantInfo',
        },
      },
      {
        $lookup: {
          from: 'failureclassifications',
          localField: '_id',
          foreignField: 'payment',
          as: 'classification',
        },
      },
      { $unwind: { path: '$merchantInfo', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$classification', preserveNullAndEmptyArrays: true } },
    ]);

    const rows = payments.map((p) => ({
      paymentId: p.paymentId,
      merchantCode: p.merchantInfo?.merchantCode || 'N/A',
      gateway: p.gateway,
      issuingBank: p.issuingBank || 'UNKNOWN',
      amount: p.amount,
      currency: p.currency,
      predictedCategory: p.classification?.predictedCategory || 'UNCLASSIFIED',
      isoCode: p.classification?.isoCode || 'N/A',
      confidence: p.classification?.confidence || 0,
      source: p.classification?.source || 'N/A',
      rawFailureReason: p.rawFailureReason || 'UNSPECIFIED',
      processedAt: p.processedAt ? new Date(p.processedAt).toISOString() : new Date(p.createdAt).toISOString(),
    }));

    const columns = [
      { key: 'paymentId', header: 'Payment ID' },
      { key: 'merchantCode', header: 'Merchant Code' },
      { key: 'gateway', header: 'Gateway' },
      { key: 'issuingBank', header: 'Issuing Bank' },
      { key: 'amount', header: 'Amount' },
      { key: 'currency', header: 'Currency' },
      { key: 'predictedCategory', header: 'Predicted Category' },
      { key: 'isoCode', header: 'ISO 8583 Code' },
      { key: 'confidence', header: 'Confidence' },
      { key: 'source', header: 'Source' },
      { key: 'rawFailureReason', header: 'Raw Gateway Error' },
      { key: 'processedAt', header: 'Failure Date' },
    ];

    return { rows, columns };
  }

  // 3. Merchant Reconciliation Report Builder
  async buildMerchantReconciliation(filters, start, end) {
    const match = { createdAt: { $gte: start, $lte: end } };
    if (filters.merchantId) match.merchant = filters.merchantId;

    const data = await Payment.aggregate([
      { $match: match },
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
      { $unwind: { path: '$merchantInfo', preserveNullAndEmptyArrays: true } },
    ]);

    const rows = data.map((d) => ({
      merchantCode: d.merchantInfo?.merchantCode || 'N/A',
      merchantName: d.merchantInfo?.name || 'Unknown Merchant',
      contactEmail: d.merchantInfo?.contactEmail || 'N/A',
      status: d.merchantInfo?.status || 'N/A',
      totalPayments: d.totalPayments,
      successfulPayments: d.successfulPayments,
      failedPayments: d.failedPayments,
      successRate: calculatePercentage(d.successfulPayments, d.totalPayments),
      totalVolume: parseFloat((d.totalVolume || 0).toFixed(2)),
    }));

    const columns = [
      { key: 'merchantCode', header: 'Merchant Code' },
      { key: 'merchantName', header: 'Merchant Name' },
      { key: 'contactEmail', header: 'Contact Email' },
      { key: 'status', header: 'Status' },
      { key: 'totalPayments', header: 'Total Transactions' },
      { key: 'successfulPayments', header: 'Successful Count' },
      { key: 'failedPayments', header: 'Failed Count' },
      { key: 'successRate', header: 'Success Rate (%)' },
      { key: 'totalVolume', header: 'Total Volume (USD)' },
    ];

    return { rows, columns };
  }

  // 4. Gateway Performance Report Builder
  async buildGatewayPerformance(filters, start, end) {
    const match = { createdAt: { $gte: start, $lte: end } };
    if (filters.merchantId) match.merchant = filters.merchantId;

    const data = await Payment.aggregate([
      { $match: match },
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

    const rows = data.map((d) => ({
      gateway: d._id,
      totalPayments: d.totalPayments,
      successfulPayments: d.successfulPayments,
      failedPayments: d.failedPayments,
      successRate: calculatePercentage(d.successfulPayments, d.totalPayments),
      failureRate: calculatePercentage(d.failedPayments, d.totalPayments),
      totalVolume: parseFloat((d.totalVolume || 0).toFixed(2)),
      failedVolume: parseFloat((d.failedVolume || 0).toFixed(2)),
    }));

    const columns = [
      { key: 'gateway', header: 'Gateway' },
      { key: 'totalPayments', header: 'Total Transactions' },
      { key: 'successfulPayments', header: 'Success Count' },
      { key: 'failedPayments', header: 'Failure Count' },
      { key: 'successRate', header: 'Success Rate (%)' },
      { key: 'failureRate', header: 'Failure Rate (%)' },
      { key: 'totalVolume', header: 'Total Volume' },
      { key: 'failedVolume', header: 'Failed Volume' },
    ];

    return { rows, columns };
  }

  // 5. Audit Trail Report Builder
  async buildAuditTrail(filters, start, end) {
    const query = { createdAt: { $gte: start, $lte: end } };
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.action) query.action = filters.action;

    const limit = Math.min(10000, parseInt(filters.limit, 10) || 5000);

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorUser', 'name email role')
      .lean();

    const rows = logs.map((l) => ({
      timestamp: l.createdAt.toISOString(),
      action: l.action,
      actorRole: l.actorRole,
      actorEmail: l.actorUser?.email || 'SYSTEM',
      entityType: l.entityType,
      entityId: l.entityId,
      ipAddress: l.ipAddress || 'N/A',
      requestId: l.requestId || 'N/A',
      correlationId: l.correlationId || 'N/A',
    }));

    const columns = [
      { key: 'timestamp', header: 'Timestamp' },
      { key: 'action', header: 'Action' },
      { key: 'actorRole', header: 'Actor Role' },
      { key: 'actorEmail', header: 'User Email' },
      { key: 'entityType', header: 'Entity Type' },
      { key: 'entityId', header: 'Entity ID' },
      { key: 'ipAddress', header: 'IP Address' },
      { key: 'requestId', header: 'Request ID' },
      { key: 'correlationId', header: 'Correlation ID' },
    ];

    return { rows, columns };
  }
}

module.exports = new ReportBuilderService();
