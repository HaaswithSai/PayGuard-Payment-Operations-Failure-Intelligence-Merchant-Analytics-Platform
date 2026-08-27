/**
 * PayGuard Failure Classification & Queue Worker Test Suite
 * Validates:
 * - Text normalization and tokenization
 * - ISO 8583 response code taxonomy lookup and regex extraction
 * - Rule-based heuristic classification engine and confidence scoring
 * - ML microservice client bridge with graceful fallback
 * - Inspection and queue management endpoint access guards
 */

const http = require('http');
const { app, env, enums } = require('./src');
const { normalizeFailureText } = require('./src/utils/textNormalization.utils');
const { lookupIsoCode, extractIsoCodeFromText } = require('./src/utils/iso8583.utils');
const { classifyWithRules } = require('./src/utils/failureNormalization.utils');
const mlClientService = require('./src/services/mlClient.service');

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

async function runClassificationTests() {
  console.log('====================================================');
  console.log('PAYGUARD FAILURE CLASSIFICATION & QUEUE WORKER TEST SUITE');
  console.log('====================================================\n');

  // 1. Test Text Normalization
  console.log('1. Testing Text Normalization...');
  const sample1 = 'card_declined_insufficient_funds-51!';
  const normalized1 = normalizeFailureText(sample1);
  assert(normalized1 === 'card declined insufficient funds 51', 'normalizeFailureText cleans punctuation, hyphens, underscores');

  const sample2 = '  3DS   Authentication-Failed // OTP: Timeout. ';
  const normalized2 = normalizeFailureText(sample2);
  assert(normalized2 === '3ds authentication failed otp timeout', 'normalizeFailureText handles mixed casing, slashes, extra spaces');

  // 2. Test ISO 8583 Lookup & Extraction
  console.log('\n2. Testing ISO 8583 Taxonomy Utilities...');
  const iso51 = lookupIsoCode('51');
  assert(iso51 && iso51.category === enums.FAILURE_CATEGORIES.INSUFFICIENT_FUNDS, 'ISO code 51 maps to INSUFFICIENT_FUNDS');
  assert(iso51.confidence === 1.0, 'ISO code 51 provides 1.0 confidence');

  const iso54 = lookupIsoCode('54');
  assert(iso54 && iso54.category === enums.FAILURE_CATEGORIES.CARD_EXPIRED, 'ISO code 54 maps to CARD_EXPIRED');

  const iso59 = lookupIsoCode('59');
  assert(iso59 && iso59.category === enums.FAILURE_CATEGORIES.FRAUD_SUSPECTED, 'ISO code 59 maps to FRAUD_SUSPECTED');

  const iso96 = lookupIsoCode('96');
  assert(iso96 && iso96.category === enums.FAILURE_CATEGORIES.SYSTEM_ERROR, 'ISO code 96 maps to SYSTEM_ERROR');

  const extracted1 = extractIsoCodeFromText('Transaction rejected by bank with code 51');
  assert(extracted1 === '51', 'extractIsoCodeFromText extracts 2-digit ISO code from text');

  const extracted2 = extractIsoCodeFromText('Decline response: iso_54');
  assert(extracted2 === '54', 'extractIsoCodeFromText extracts prefixed ISO token');

  // 3. Test Rule-Based Classification Engine
  console.log('\n3. Testing Rule-Based Classification Engine...');

  // Insufficient Funds
  const res1 = classifyWithRules({ rawFailureReason: 'card_declined_insufficient_funds' });
  assert(res1.predictedCategory === enums.FAILURE_CATEGORIES.INSUFFICIENT_FUNDS, 'card_declined_insufficient_funds classifies as INSUFFICIENT_FUNDS');
  assert(res1.confidence >= 0.9, 'INSUFFICIENT_FUNDS classification confidence >= 0.9');

  // Card Expired
  const res2 = classifyWithRules({ rawFailureReason: 'card validity has expired' });
  assert(res2.predictedCategory === enums.FAILURE_CATEGORIES.CARD_EXPIRED, 'card validity has expired classifies as CARD_EXPIRED');

  // Authentication Failed
  const res3 = classifyWithRules({ rawFailureReason: '3D secure authentication failed - incorrect OTP' });
  assert(res3.predictedCategory === enums.FAILURE_CATEGORIES.AUTHENTICATION_FAILED, '3DS failure classifies as AUTHENTICATION_FAILED');

  // Fraud Suspected
  const res4 = classifyWithRules({ rawFailureReason: 'transaction flagged as suspected fraud by risk engine' });
  assert(res4.predictedCategory === enums.FAILURE_CATEGORIES.FRAUD_SUSPECTED, 'suspected fraud classifies as FRAUD_SUSPECTED');

  // Network Timeout
  const res5 = classifyWithRules({ rawFailureReason: 'gateway timeout 504 ETIMEDOUT' });
  assert(res5.predictedCategory === enums.FAILURE_CATEGORIES.NETWORK_TIMEOUT, 'gateway timeout classifies as NETWORK_TIMEOUT');

  // Limit Exceeded
  const res6 = classifyWithRules({ rawFailureReason: 'card daily velocity limit exceeded' });
  assert(res6.predictedCategory === enums.FAILURE_CATEGORIES.LIMIT_EXCEEDED, 'daily limit exceeded classifies as LIMIT_EXCEEDED');

  // Invalid Details
  const res7 = classifyWithRules({ rawFailureReason: 'invalid card number luhn check failure' });
  assert(res7.predictedCategory === enums.FAILURE_CATEGORIES.INVALID_DETAILS, 'invalid card number classifies as INVALID_DETAILS');

  // Direct ISO code in metadata
  const res8 = classifyWithRules({
    rawFailureReason: 'generic decline',
    metadata: { gatewayPayload: { isoCode: '51' } },
  });
  assert(res8.predictedCategory === enums.FAILURE_CATEGORIES.INSUFFICIENT_FUNDS, 'metadata ISO code 51 overrides generic decline');
  assert(res8.confidence === 1.0, 'Direct metadata ISO code achieves 1.0 confidence');

  // Unknown / Ambiguous Fallback
  const res9 = classifyWithRules({ rawFailureReason: 'xyz_unrecognized_custom_bank_token_999' });
  assert(res9.predictedCategory === enums.FAILURE_CATEGORIES.OTHERS, 'Unrecognized failure falls back to OTHERS');
  assert(res9.confidence === 0.5, 'Fallback confidence is set to 0.5');

  // 4. Test ML Client Bridge Fallback
  console.log('\n4. Testing ML Bridge Interface...');
  const mlResult = await mlClientService.predict({ rawText: 'insufficient funds' });
  assert(mlResult === null, 'ML bridge gracefully returns null when ML microservice is unconfigured');

  // 5. Test HTTP Endpoints & Auth Guards
  console.log('\n5. Testing HTTP Classification & Queue Endpoints...');

  const unauthedClassRes = await testRequest(app, { path: '/api/v1/classifications', method: 'GET' });
  assert(unauthedClassRes.statusCode === 401, 'GET /classifications without token returns 401 Unauthorized');

  const unauthedPaymentClassRes = await testRequest(app, {
    path: '/api/v1/classifications/64b1f2e3d4c5b6a789012399',
    method: 'GET',
  });
  assert(unauthedPaymentClassRes.statusCode === 401, 'GET /classifications/:paymentId without token returns 401 Unauthorized');

  const unauthedOverrideRes = await testRequest(app, {
    path: '/api/v1/classifications/64b1f2e3d4c5b6a789012399/override',
    method: 'PATCH',
  });
  assert(unauthedOverrideRes.statusCode === 401, 'PATCH /classifications/:paymentId/override without token returns 401 Unauthorized');

  const unauthedQueueJobsRes = await testRequest(app, { path: '/api/v1/queue/jobs', method: 'GET' });
  assert(unauthedQueueJobsRes.statusCode === 401, 'GET /queue/jobs without token returns 401 Unauthorized');

  const unauthedProcessQueueRes = await testRequest(app, { path: '/api/v1/queue/process', method: 'POST' });
  assert(unauthedProcessQueueRes.statusCode === 401, 'POST /queue/process without token returns 401 Unauthorized');

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} CLASSIFICATION TESTS PASSED!`);
  console.log('====================================================\n');
}

runClassificationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Classification Tests Failed:', err);
    process.exit(1);
  });
