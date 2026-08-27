const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { USER_ROLES } = require('../constants/enums');
const { validateAnalyticsQuery } = require('../validators/analytics.validator');

const router = express.Router();

// All analytics endpoints require authentication
router.use(protect);

// 1. Overview Summary Cards (Admin, Support, Merchant [scoped])
router.get('/summary', validateAnalyticsQuery, analyticsController.getSummary);

// 2. Time-Series Trends
router.get('/payments-trend', validateAnalyticsQuery, analyticsController.getPaymentsTrend);

// 3. Breakdown by Normalized Category
router.get('/failures-by-category', validateAnalyticsQuery, analyticsController.getFailuresByCategory);

// 4. Breakdown by Gateway
router.get('/failures-by-gateway', validateAnalyticsQuery, analyticsController.getFailuresByGateway);

// 5. Breakdown by Issuing Bank
router.get('/failures-by-bank', validateAnalyticsQuery, analyticsController.getFailuresByBank);

// 6. Merchant Performance
router.get('/merchant-performance', validateAnalyticsQuery, analyticsController.getMerchantPerformance);

// 7. Top Raw Failure Reasons
router.get('/top-failure-reasons', validateAnalyticsQuery, analyticsController.getTopFailureReasons);

// 8. Live Activity Feed
router.get('/recent-activity', validateAnalyticsQuery, analyticsController.getRecentActivity);

// 9. Queue Health Telemetry (Admin & Support Only)
router.get(
  '/queue-stats',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  analyticsController.getQueueStats
);

module.exports = router;
