/**
 * PayGuard Webhook Ingestion & Payment Event Storage Test Suite
 * Validates:
 * - Webhook HMAC SHA-256 signature generation and timing-safe verification
 * - Webhook payload validation (eventId, paymentId, idempotencyKey, status, amount, currency)
 * - Simulated gateway payload generator
 * - Webhook event inspection endpoints & authentication guards
 */

const http = require('http');
const { app, env, enums } = require('./src');
const {
  generateHmacSignature,
  verifyHmacSignature,
  generateSimulatedWebhookPayload,
  DEFAULT_SIMULATED_SECRET,
} = require('./src/utils/webhook.utils');
const {
  validateWebhookPayload,
  validateWebhookEventIdParam,
} = require('./src/validators/webhook.validator');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Helper to perform HTTP request to Express app
 */
function testRequest(appInstance, options, postData = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);
    server.listen(0, () => {
      const port = server.address().port;
      const reqOptions = {
        hostname: '127.0.0.1',
        port: port,
        path: options.path,
        method: options.method || 'GET',
        headers: { Connection: 'close', ...(options.headers || {}) },
        agent: false,
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close(() => {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
            } catch (e) {
              resolve({ statusCode: res.statusCode, headers: res.headers, rawBody: data });
            }
          });
        });
      });

      req.on('error', (err) => {
        server.close(() => reject(err));
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  });
}

async function runWebhookTests() {
  console.log('====================================================');
  console.log('PAYGUARD WEBHOOK INGESTION & EVENT STORAGE TEST SUITE');
  console.log('====================================================\n');

  // 1. Test HMAC Signature Utilities
  console.log('1. Testing HMAC Signature Utilities...');
  const samplePayload = {
    eventId: 'evt_test_123',
    paymentId: 'pay_test_456',
    amount: 250.0,
    currency: 'USD',
  };
  const sampleSecret = 'whsec_sample_secret_key_789';

  const validSignature = generateHmacSignature(samplePayload, sampleSecret);
  assert(typeof validSignature === 'string' && validSignature.length === 64, 'generateHmacSignature returns 64-char hex string');

  const isValidMatch = verifyHmacSignature(samplePayload, validSignature, sampleSecret, false);
  assert(isValidMatch === true, 'verifyHmacSignature returns true for valid matching signature');

  const isTamperedMatch = verifyHmacSignature(samplePayload, 'bad_signature_hex_000000000000000000000000000000000000000000000000', sampleSecret, false);
  assert(isTamperedMatch === false, 'verifyHmacSignature returns false for tampered signature');

  const isSimulatedBypassValid = verifyHmacSignature(samplePayload, 'simulated_test_sig', null, true);
  assert(isSimulatedBypassValid === true, 'verifyHmacSignature supports simulated gateway test signatures');

  // 2. Test Simulated Gateway Payload Generator
  console.log('\n2. Testing Simulated Gateway Generator...');
  const simulated = generateSimulatedWebhookPayload({
    merchantCode: 'MCH_TEST_001',
    gateway: 'SIMULATED',
    amount: 99.99,
    currency: 'EUR',
    status: 'FAILED',
    rawFailureReason: 'card_declined_insufficient_funds',
  });

  assert(simulated.payload.eventId.startsWith('evt_sim_'), 'Simulated payload generates unique eventId');
  assert(simulated.payload.paymentId.startsWith('pay_sim_'), 'Simulated payload generates unique paymentId');
  assert(simulated.payload.idempotencyKey.startsWith('idemp_sim_'), 'Simulated payload generates unique idempotencyKey');
  assert(simulated.payload.status === 'FAILED', 'Simulated payload preserves requested status');
  assert(simulated.payload.rawFailureReason === 'card_declined_insufficient_funds', 'Simulated payload preserves rawFailureReason');
  assert(simulated.headers['x-gateway-signature'] === simulated.signature, 'Simulated headers include matching x-gateway-signature');

  // 3. Test Webhook Payload Validator
  console.log('\n3. Testing Webhook Payload Validator...');

  // Missing required fields
  let missingPayloadErr = null;
  validateWebhookPayload({ body: {} }, {}, (err) => {
    missingPayloadErr = err;
  });
  assert(
    missingPayloadErr && missingPayloadErr.statusCode === 400 && missingPayloadErr.code === 'INVALID_WEBHOOK_PAYLOAD',
    'validateWebhookPayload rejects empty payload with INVALID_WEBHOOK_PAYLOAD'
  );

  // Invalid gateway
  let invalidGatewayErr = null;
  validateWebhookPayload(
    {
      body: {
        eventId: 'evt_1',
        merchantCode: 'MCH_001',
        gateway: 'UNSUPPORTED_GATEWAY_XYZ',
        paymentId: 'pay_1',
        idempotencyKey: 'idemp_1',
        status: 'SUCCESS',
        amount: 100,
        currency: 'USD',
      },
    },
    {},
    (err) => {
      invalidGatewayErr = err;
    }
  );
  assert(invalidGatewayErr && invalidGatewayErr.statusCode === 400, 'validateWebhookPayload rejects unsupported gateway');

  // Invalid payment status
  let invalidStatusErr = null;
  validateWebhookPayload(
    {
      body: {
        eventId: 'evt_1',
        merchantCode: 'MCH_001',
        gateway: 'STRIPE',
        paymentId: 'pay_1',
        idempotencyKey: 'idemp_1',
        status: 'UNKNOWN_STATUS',
        amount: 100,
        currency: 'USD',
      },
    },
    {},
    (err) => {
      invalidStatusErr = err;
    }
  );
  assert(invalidStatusErr && invalidStatusErr.statusCode === 400, 'validateWebhookPayload rejects invalid payment status');

  // Negative amount
  let negativeAmountErr = null;
  validateWebhookPayload(
    {
      body: {
        eventId: 'evt_1',
        merchantCode: 'MCH_001',
        gateway: 'STRIPE',
        paymentId: 'pay_1',
        idempotencyKey: 'idemp_1',
        status: 'SUCCESS',
        amount: -50,
        currency: 'USD',
      },
    },
    {},
    (err) => {
      negativeAmountErr = err;
    }
  );
  assert(negativeAmountErr && negativeAmountErr.statusCode === 400, 'validateWebhookPayload rejects negative amount');

  // Valid payload normalization
  const validReq = {
    body: {
      eventId: 'evt_valid_999',
      merchantCode: 'mch_acme_corp ',
      gateway: 'STRIPE',
      paymentId: 'pay_valid_999',
      idempotencyKey: 'idemp_valid_999',
      status: 'SUCCESS',
      amount: 199.5,
      currency: 'usd',
    },
  };
  let validErr = null;
  validateWebhookPayload(validReq, {}, (err) => {
    validErr = err;
  });
  assert(!validErr, 'validateWebhookPayload accepts valid payload');
  assert(validReq.body.merchantCode === 'MCH_ACME_CORP', 'merchantCode is normalized to uppercase');
  assert(validReq.body.currency === 'USD', 'currency is normalized to uppercase');

  // 4. Test Webhook Event ID Param Validator
  console.log('\n4. Testing Webhook Event ID Param Validator...');
  let badParamErr = null;
  validateWebhookEventIdParam({ params: { id: 'invalid-id-123' } }, {}, (err) => {
    badParamErr = err;
  });
  assert(badParamErr && badParamErr.statusCode === 400, 'validateWebhookEventIdParam rejects non-ObjectId string');

  // 5. Test HTTP Ingestion & Inspection Endpoints
  console.log('\n5. Testing HTTP Webhook Endpoints...');

  // POST /gateway with malformed JSON
  const malformedPostRes = await testRequest(
    app,
    {
      path: '/api/v1/webhooks/gateway',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {}
  );
  assert(malformedPostRes.statusCode === 400, 'POST /webhooks/gateway with empty body returns 400 Bad Request');
  assert(malformedPostRes.body.error.code === 'INVALID_WEBHOOK_PAYLOAD', 'POST /webhooks/gateway returns INVALID_WEBHOOK_PAYLOAD code');

  // Protected Inspection Endpoints
  const unauthedEventsRes = await testRequest(app, { path: '/api/v1/webhooks/events', method: 'GET' });
  assert(unauthedEventsRes.statusCode === 401, 'GET /webhooks/events without token returns 401 Unauthorized');

  const unauthedEventByIdRes = await testRequest(app, {
    path: '/api/v1/webhooks/events/64b1f2e3d4c5b6a789012399',
    method: 'GET',
  });
  assert(unauthedEventByIdRes.statusCode === 401, 'GET /webhooks/events/:id without token returns 401 Unauthorized');

  const unauthedReplayRes = await testRequest(app, {
    path: '/api/v1/webhooks/events/64b1f2e3d4c5b6a789012399/replay',
    method: 'POST',
  });
  assert(unauthedReplayRes.statusCode === 401, 'POST /webhooks/events/:id/replay without token returns 401 Unauthorized');

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} WEBHOOK TESTS PASSED!`);
  console.log('====================================================\n');
}

runWebhookTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Webhook Tests Failed:', err);
    process.exit(1);
  });
