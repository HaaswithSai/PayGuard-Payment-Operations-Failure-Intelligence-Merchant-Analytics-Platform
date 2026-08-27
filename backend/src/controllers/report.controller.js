const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/report.service');
const { REPORT_TYPES, REPORT_FORMATS } = require('../constants/enums');

/**
 * Extract request context for audit logging
 */
const getRequestContext = (req) => ({
  requestId: req.headers['x-request-id'] || null,
  correlationId: req.headers['x-correlation-id'] || null,
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'] || null,
});

/**
 * @route   POST /api/v1/reports
 * @desc    Request and generate a new report
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport({
    reportType: req.body.reportType,
    format: req.body.format,
    filtersUsed: req.body.filtersUsed || {},
    actorUser: req.user,
    requestContext: getRequestContext(req),
  });

  res.status(201).json({
    success: true,
    message: 'Report generated successfully',
    report,
  });
});

/**
 * @route   GET /api/v1/reports
 * @desc    List generated reports
 * @access  Private (Admin, Support, Merchant [self only])
 */
const listReports = asyncHandler(async (req, res) => {
  const result = await reportService.listReports({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.reports.length,
    pagination: result.pagination,
    reports: result.reports,
  });
});

/**
 * @route   GET /api/v1/reports/types
 * @desc    List available report types and supported export formats
 * @access  Private (Admin, Support, Merchant)
 */
const getReportTypes = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    types: Object.values(REPORT_TYPES),
    formats: Object.values(REPORT_FORMATS),
  });
});

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Get report metadata by ID
 * @access  Private (Admin, Support, Merchant [self only])
 */
const getReportById = asyncHandler(async (req, res) => {
  const report = await reportService.getReportById(req.params.id, req.user);

  res.status(200).json({
    success: true,
    report,
  });
});

/**
 * @route   GET /api/v1/reports/:id/download
 * @desc    Download generated report file
 * @access  Private (Admin, Support, Merchant [self only])
 */
const downloadReport = asyncHandler(async (req, res) => {
  const { fileBuffer, contentType, filename } = await reportService.downloadReport(
    req.params.id,
    req.user,
    getRequestContext(req)
  );

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  res.status(200).send(fileBuffer);
});

/**
 * @route   DELETE /api/v1/reports/:id
 * @desc    Delete report metadata and physical file
 * @access  Private (Admin, Support, Merchant [self only])
 */
const deleteReport = asyncHandler(async (req, res) => {
  const result = await reportService.deleteReport(req.params.id, req.user);

  res.status(200).json(result);
});

module.exports = {
  createReport,
  listReports,
  getReportTypes,
  getReportById,
  downloadReport,
  deleteReport,
};
