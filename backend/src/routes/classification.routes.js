const express = require('express');
const classificationController = require('../controllers/classification.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { USER_ROLES } = require('../constants/enums');

const router = express.Router();

// Protected classification endpoints
router.use(protect);

// 1. List Classifications (Admin, Support, Merchant)
router.get(
  '/',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT, USER_ROLES.MERCHANT),
  classificationController.listClassifications
);

// 2. Get Classification by Payment ID
router.get(
  '/:paymentId',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT, USER_ROLES.MERCHANT),
  classificationController.getClassificationByPaymentId
);

// 3. Override Classification (Admin & Support Only)
router.patch(
  '/:paymentId/override',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  classificationController.overrideClassification
);

module.exports = router;
