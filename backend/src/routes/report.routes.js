const express = require('express');
const reportController = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  validateCreateReport,
  validateReportIdParam,
} = require('../validators/report.validator');

const router = express.Router();

// All reporting routes require an authenticated user session
router.use(protect);

// 1. Available Report Types & Formats
router.get('/types', reportController.getReportTypes);

// 2. Request & Generate Report
router.post('/', validateCreateReport, reportController.createReport);

// 3. List Generated Reports (Admin/Support: all; Merchant: self only)
router.get('/', reportController.listReports);

// 4. Get Report Metadata by ID
router.get('/:id', validateReportIdParam, reportController.getReportById);

// 5. Download Generated Report File
router.get('/:id/download', validateReportIdParam, reportController.downloadReport);

// 6. Delete Report
router.delete('/:id', validateReportIdParam, reportController.deleteReport);

module.exports = router;
