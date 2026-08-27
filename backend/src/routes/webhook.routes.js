const express = require('express');
const webhookController = require('../controllers/webhook.controller');
const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/role.middleware');
const { USER_ROLES } = require('../constants/enums');
const {
  validateWebhookPayload,
  validateWebhookEventIdParam,
} = require('../validators/webhook.validator');

const router = express.Router();

// ==========================================
// 1. Gateway Ingestion Endpoints (Public / Signature-Verified)
// ==========================================
router.post('/gateway', validateWebhookPayload, webhookController.receiveGatewayWebhook);
router.post('/simulate', webhookController.simulateWebhook);

// ==========================================
// 2. Webhook Event Management & Inspection (Protected)
// ==========================================
router.get(
  '/events',
  protect,
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT, USER_ROLES.MERCHANT),
  webhookController.listWebhookEvents
);

router.get(
  '/events/:id',
  protect,
  validateWebhookEventIdParam,
  webhookController.getWebhookEventById
);

router.post(
  '/events/:id/replay',
  protect,
  restrictTo(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  validateWebhookEventIdParam,
  webhookController.replayWebhookEvent
);

module.exports = router;
