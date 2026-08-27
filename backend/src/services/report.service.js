const path = require('path');
const { Report, AuditLog } = require('../models');
const reportBuilderService = require('./reportBuilder.service');
const storageService = require('./storage.service');
const AppError = require('../utils/AppError');
const {
  REPORT_TYPES,
  REPORT_FORMATS,
  REPORT_STATUS,
  STORAGE_TYPES,
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  USER_ROLES,
} = require('../constants/enums');
const logger = require('../utils/logger');

/**
 * Service: Report Lifecycle Orchestration
 */
class ReportService {
  /**
   * Request and synchronously generate a new operational report
   */
  async createReport({ reportType, format = REPORT_FORMATS.CSV, filtersUsed = {}, actorUser, requestContext = {} }) {
    // 1. Enforce Multi-Tenant Boundary for Merchant Users
    if (actorUser.role === USER_ROLES.MERCHANT) {
      if (!actorUser.merchant) {
        throw new AppError('No merchant profile associated with this account', 403, 'MERCHANT_UNASSIGNED');
      }
      filtersUsed.merchantId = actorUser.merchant.toString();
    }

    // 2. Validate Enums
    if (!Object.values(REPORT_TYPES).includes(reportType)) {
      throw new AppError(`Invalid report type: '${reportType}'`, 400, 'INVALID_REPORT_TYPE');
    }
    const cleanFormat = (format || REPORT_FORMATS.CSV).toUpperCase();
    if (!Object.values(REPORT_FORMATS).includes(cleanFormat)) {
      throw new AppError(`Invalid report format: '${cleanFormat}'`, 400, 'INVALID_FORMAT');
    }

    // 3. Create initial Report tracking document
    const reportDoc = await Report.create({
      reportType,
      filtersUsed,
      format: cleanFormat,
      generatedBy: actorUser._id,
      storageType: STORAGE_TYPES.LOCAL,
      status: REPORT_STATUS.PROCESSING,
    });

    try {
      // 4. Build report data and serialize
      const { content, rowCount, filename } = await reportBuilderService.buildReport({
        reportType,
        format: cleanFormat,
        filtersUsed,
        actorUser,
      });

      // 5. Persist file to storage driver
      const { fileLocation, fileSizeBytes, storageType } = await storageService.saveReportFile({
        filename: `${reportDoc._id}_${filename}`,
        content,
        storageType: STORAGE_TYPES.LOCAL,
      });

      // 6. Update Report record to READY with 7-day retention
      reportDoc.status = REPORT_STATUS.READY;
      reportDoc.fileLocation = fileLocation;
      reportDoc.fileSizeBytes = fileSizeBytes;
      reportDoc.rowCount = rowCount;
      reportDoc.storageType = storageType;
      reportDoc.generatedAt = new Date();
      reportDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL
      await reportDoc.save();

      // 7. Record Audit Log
      try {
        await AuditLog.create({
          actorUser: actorUser._id,
          actorRole: actorUser.role,
          action: AUDIT_ACTIONS.REPORT_GENERATED,
          entityType: 'Report',
          entityId: reportDoc._id.toString(),
          afterSnapshot: {
            reportType,
            format: cleanFormat,
            rowCount,
            fileSizeBytes,
            fileLocation,
          },
          requestId: requestContext.requestId || null,
          correlationId: requestContext.correlationId || null,
          ipAddress: requestContext.ipAddress || null,
          userAgent: requestContext.userAgent || null,
          metadata: { reportType, format: cleanFormat, rowCount },
        });
      } catch (auditErr) {
        logger.error(`Failed to record report generation audit log: ${auditErr.message}`);
      }

      return reportDoc;
    } catch (err) {
      reportDoc.status = REPORT_STATUS.FAILED;
      reportDoc.errorMessage = err.message;
      await reportDoc.save();
      logger.error(`Report generation failed for ${reportDoc._id}: ${err.message}`);
      throw err;
    }
  }

  /**
   * List reports with pagination and tenant filtering
   */
  async listReports({ actorUser, query = {} }) {
    const filter = {};

    if (actorUser.role === USER_ROLES.MERCHANT) {
      filter.generatedBy = actorUser._id;
    } else {
      if (query.reportType) filter.reportType = query.reportType.toUpperCase();
      if (query.status) filter.status = query.status.toUpperCase();
      if (query.generatedBy) filter.generatedBy = query.generatedBy;
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('generatedBy', 'name email role')
        .lean(),
      Report.countDocuments(filter),
    ]);

    return {
      reports,
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
   * Get single report by ID
   */
  async getReportById(id, actorUser) {
    const report = await Report.findById(id).populate('generatedBy', 'name email role').lean();

    if (!report) {
      throw new AppError(`Report with ID '${id}' not found`, 404, 'REPORT_NOT_FOUND');
    }

    // Tenant check
    if (actorUser.role === USER_ROLES.MERCHANT && report.generatedBy?._id?.toString() !== actorUser._id.toString()) {
      throw new AppError('Access forbidden: You do not have permission to view this report', 403, 'TENANT_ACCESS_DENIED');
    }

    return report;
  }

  /**
   * Download report file
   */
  async downloadReport(id, actorUser, requestContext = {}) {
    const report = await Report.findById(id);

    if (!report) {
      throw new AppError(`Report with ID '${id}' not found`, 404, 'REPORT_NOT_FOUND');
    }

    if (actorUser.role === USER_ROLES.MERCHANT && report.generatedBy.toString() !== actorUser._id.toString()) {
      throw new AppError('Access forbidden: You do not have permission to download this report', 403, 'TENANT_ACCESS_DENIED');
    }

    if (report.status !== REPORT_STATUS.READY || !report.fileLocation) {
      throw new AppError(`Report is not ready for download (status: ${report.status})`, 400, 'REPORT_NOT_READY');
    }

    const fileBuffer = await storageService.readReportFile(report.fileLocation, report.storageType);
    const contentType = storageService.getContentType(report.format);
    const filename = path.basename(report.fileLocation);

    // Record Audit Log for Download
    try {
      await AuditLog.create({
        actorUser: actorUser._id,
        actorRole: actorUser.role,
        action: AUDIT_ACTIONS.REPORT_DOWNLOADED,
        entityType: 'Report',
        entityId: report._id.toString(),
        requestId: requestContext.requestId || null,
        correlationId: requestContext.correlationId || null,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
        metadata: { downloadedBy: actorUser.email, filename },
      });
    } catch (auditErr) {
      logger.error(`Failed to record report download audit: ${auditErr.message}`);
    }

    return {
      fileBuffer,
      contentType,
      filename,
    };
  }

  /**
   * Delete report metadata and file
   */
  async deleteReport(id, actorUser) {
    const report = await Report.findById(id);

    if (!report) {
      throw new AppError(`Report with ID '${id}' not found`, 404, 'REPORT_NOT_FOUND');
    }

    if (actorUser.role === USER_ROLES.MERCHANT && report.generatedBy.toString() !== actorUser._id.toString()) {
      throw new AppError('Access forbidden: You cannot delete another user\'s report', 403, 'TENANT_ACCESS_DENIED');
    }

    if (report.fileLocation) {
      await storageService.deleteReportFile(report.fileLocation, report.storageType);
    }

    await Report.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Report deleted successfully',
    };
  }
}

module.exports = new ReportService();
