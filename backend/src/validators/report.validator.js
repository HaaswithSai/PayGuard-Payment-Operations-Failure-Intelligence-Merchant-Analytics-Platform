const mongoose = require('mongoose');
const { REPORT_TYPES, REPORT_FORMATS } = require('../constants/enums');
const AppError = require('../utils/AppError');

/**
 * Validate Report Generation Request Body
 */
const validateCreateReport = (req, res, next) => {
  const { reportType, format, filtersUsed } = req.body;
  const errors = [];

  // 1. Report Type
  if (!reportType || !Object.values(REPORT_TYPES).includes(reportType)) {
    errors.push({
      field: 'reportType',
      message: `Invalid reportType: '${reportType}'. Supported: ${Object.values(REPORT_TYPES).join(', ')}`,
    });
  }

  // 2. Format
  if (format && !Object.values(REPORT_FORMATS).includes(format.toUpperCase())) {
    errors.push({
      field: 'format',
      message: `Invalid format: '${format}'. Supported: ${Object.values(REPORT_FORMATS).join(', ')}`,
    });
  }

  // 3. Filters Used (optional object)
  if (filtersUsed && typeof filtersUsed !== 'object') {
    errors.push({ field: 'filtersUsed', message: 'filtersUsed must be a valid object' });
  }

  if (errors.length > 0) {
    return next(new AppError('Report request validation failed', 400, 'VALIDATION_ERROR', errors));
  }

  if (req.body.format) {
    req.body.format = req.body.format.toUpperCase();
  }

  next();
};

/**
 * Validate MongoDB ObjectId parameter (:id)
 */
const validateReportIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError(`Invalid report ID format: '${id}'`, 400, 'INVALID_ID_FORMAT'));
  }
  next();
};

module.exports = {
  validateCreateReport,
  validateReportIdParam,
};
