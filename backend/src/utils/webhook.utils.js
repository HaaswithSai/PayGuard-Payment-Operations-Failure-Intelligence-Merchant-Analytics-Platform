const crypto = require('crypto');
const env = require('../config/env');

const DEFAULT_SIMULATED_SECRET = 'whsec_simulated_test_secret_123';

/**
 * Generate HMAC SHA-256 signature for a webhook payload
 * @param {object|string} payload - Webhook payload object or string
 * @param {string} secret - Merchant / Gateway HMAC secret
 * @returns {string} Hex-encoded HMAC signature
 */
const generateHmacSignature = (payload, secret) => {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret || DEFAULT_SIMULATED_SECRET).update(data).digest('hex');
};

/**
 * Verify incoming webhook HMAC signature
 * @param {object|string} payload - Incoming payload
 * @param {string} signature - Incoming signature header or parameter
 * @param {string} secret - Merchant webhook secret
 * @param {boolean} [isSimulated=false] - Whether request is from simulated gateway
 * @returns {boolean} True if signature matches
 */
const verifyHmacSignature = (payload, signature, secret, isSimulated = false) => {
  if (!signature) return false;

  // Development bypass token for simulated gateway testing
  if (isSimulated && (signature === 'simulated_test_sig' || signature === 'simulated_signature_bypass_dev')) {
    return true;
  }

  const effectiveSecret = secret || (isSimulated ? DEFAULT_SIMULATED_SECRET : null);
  if (!effectiveSecret) return false;

  const expectedSignature = generateHmacSignature(payload, effectiveSecret);

  // Normalize signatures for comparison
  const normalizedIncoming = signature.startsWith('sha256=') ? signature.split('sha256=')[1] : signature;

  if (normalizedIncoming.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalizedIncoming, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    return false;
  }
};

/**
 * Helper to generate mock/simulated gateway payloads for testing
 */
const generateSimulatedWebhookPayload = ({
  merchantCode = 'MCH_ACME_001',
  gateway = 'SIMULATED',
  amount = 150.0,
  currency = 'USD',
  status = 'SUCCESS',
  rawFailureReason = null,
  issuingBank = 'Chase Bank',
  customerRef = 'cust_12345',
} = {}) => {
  const eventId = 'evt_sim_' + crypto.randomBytes(8).toString('hex');
  const paymentId = 'pay_sim_' + crypto.randomBytes(8).toString('hex');
  const idempotencyKey = 'idemp_sim_' + crypto.randomBytes(10).toString('hex');

  const payload = {
    eventId,
    merchantCode,
    gateway,
    paymentId,
    idempotencyKey,
    status,
    amount,
    currency,
    issuingBank,
    rawFailureReason,
    customerRef,
    metadata: {
      gatewayPayload: { simulatedTxnId: 'sim_txn_' + Date.now() },
      customerInfo: { email: 'shopper@example.com', customerId: customerRef },
      deviceInfo: { platform: 'Web', ip: '198.51.100.1' },
      networkInfo: { cardBrand: 'VISA', cardLast4: '4242', bin: '424242' },
    },
    processedAt: new Date().toISOString(),
  };

  const signature = generateHmacSignature(payload, DEFAULT_SIMULATED_SECRET);

  return {
    payload,
    signature,
    headers: {
      'x-gateway-signature': signature,
      'x-gateway-event-id': eventId,
      'content-type': 'application/json',
    },
  };
};

module.exports = {
  generateHmacSignature,
  verifyHmacSignature,
  generateSimulatedWebhookPayload,
  DEFAULT_SIMULATED_SECRET,
};
