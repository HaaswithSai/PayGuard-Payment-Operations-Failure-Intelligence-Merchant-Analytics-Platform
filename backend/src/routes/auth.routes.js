const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { USER_ROLES } = require('../constants/enums');
const {
  validateLogin,
  validateRegister,
  validateChangePassword,
} = require('../validators/auth.validator');

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', validateLogin, authController.login);
router.post('/register-merchant', authController.registerMerchant);

// Protected Admin-Only User Provisioning
router.post('/register', protect, restrictTo(USER_ROLES.ADMIN), validateRegister, authController.register);

// Protected User Endpoints
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);
router.post('/change-password', protect, validateChangePassword, authController.changePassword);

module.exports = router;
