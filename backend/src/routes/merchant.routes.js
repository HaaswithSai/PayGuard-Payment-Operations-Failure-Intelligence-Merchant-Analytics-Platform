const express = require('express');
const merchantController = require('../controllers/merchant.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { checkMerchantTenantAccess } = require('../middleware/merchantAccess.middleware');
const { USER_ROLES } = require('../constants/enums');
const {
  validateMerchantIdParam,
  validateCreateMerchant,
  validateUpdateMerchant,
  validateUpdateConfiguration,
  validateUpdateStatus,
} = require('../validators/merchant.validator');

const router = express.Router();

// All merchant endpoints require an authenticated user session
router.use(protect);

// 1. Create Merchant (Admin Only)
router.post(
  '/',
  restrictTo(USER_ROLES.ADMIN),
  validateCreateMerchant,
  merchantController.createMerchant
);

// 2. List Merchants (Admin & Support: global; Merchant: scoped to self)
router.get(
  '/',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT, USER_ROLES.MERCHANT),
  merchantController.listMerchants
);

// 3. Get Merchant by Code
router.get(
  '/code/:merchantCode',
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT, USER_ROLES.MERCHANT),
  merchantController.getMerchantByCode
);

// 4. Get Merchant by ID (Tenant-safe)
router.get(
  '/:id',
  validateMerchantIdParam,
  checkMerchantTenantAccess,
  merchantController.getMerchantById
);

// 5. Update General Merchant Details (Admin Only)
router.patch(
  '/:id',
  restrictTo(USER_ROLES.ADMIN),
  validateMerchantIdParam,
  validateUpdateMerchant,
  merchantController.updateMerchant
);

// 6. Update Configuration Subdocument (Admin Only)
router.patch(
  '/:id/configuration',
  restrictTo(USER_ROLES.ADMIN),
  validateMerchantIdParam,
  validateUpdateConfiguration,
  merchantController.updateConfiguration
);

// 7. Update Merchant Status (Admin Only)
router.patch(
  '/:id/status',
  restrictTo(USER_ROLES.ADMIN),
  validateMerchantIdParam,
  validateUpdateStatus,
  merchantController.updateStatus
);

// 8. Soft-Delete / Deactivate Merchant (Admin Only)
router.delete(
  '/:id',
  restrictTo(USER_ROLES.ADMIN),
  validateMerchantIdParam,
  merchantController.deleteMerchant
);

module.exports = router;
