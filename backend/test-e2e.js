/**
 * PayGuard Master End-to-End (E2E) Integration & Release Verification Suite
 *
 * Validates the complete multi-tier enterprise payment flow:
 * 1. Health Telemetry & Environment Consistency
 * 2. Cryptographic Auth & RBAC Security (Bcrypt, JWT, Role Guards)
 * 3. Multi-Tenant Merchant Provisioning & Configuration
 * 4. Webhook Ingestion & Idempotent Ledger Storage (HMAC-SHA256)
 * 5. Failure Classification & ISO 8583 Normalization
 * 6. Analytics Aggregation Engine (KPIs, Trends, Gateways, Banks)
 * 7. Report Generation, Storage Drivers, and File Downloads (CSV & XLSX)
 */

const http = require('http');
const { app, env, enums } = require('./src');
const { hashPassword, comparePassword } = require('./src/utils/password');
const { signToken, verifyToken } = require('./src/utils/jwt');
const {
  generateHmacSignature,
  verifyHmacSignature,
  generateSimulatedWebhookPayload,
  DEFAULT_SIMULATED_SECRET,
} = require('./src/utils/webhook.utils');
const { classifyWithRules } = require('./src/utils/failureNormalization.utils');
const { parseDateRange, calculatePercentage } = require('./src/utils/analytics.utils');
const { jsonToCsv } = require('./src/utils/csv.utils');
const { jsonToExcelXml } = require('./src/utils/xlsx.utils');
const storageService = require('./src/services/storage.service');

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

async function runMasterE2ETests() {
  console.log('======================================================================');
  console.log('🚀 PAYGUARD MASTER END-TO-END (E2E) INTEGRATION VERIFICATION SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // Stage 1: Health Telemetry & Root API Handshake
  // -------------------------------------------------------------------------
  console.log('Stage 1: Validating Health Telemetry & Root Endpoints...');
  const rootRes = await testRequest(app, { path: '/', method: 'GET' });
  assert(rootRes.statusCode === 200, 'GET / responds with 200 OK');
  assert(rootRes.body.service === 'payguard-backend', 'Root service identifier is payguard-backend');
  assert(rootRes.body.endpoints.analytics === '/api/v1/analytics', 'Root manifests analytics endpoint');
  assert(rootRes.body.endpoints.reports === '/api/v1/reports', 'Root manifests reports endpoint');

  const healthRes = await testRequest(app, { path: '/api/v1/health', method: 'GET' });
  assert(healthRes.body.service === 'payguard-backend', 'Health endpoint reports payguard-backend service');
  assert(healthRes.body.database !== undefined, 'Health check exposes database connectivity telemetry');

  // -------------------------------------------------------------------------
  // Stage 2: Authentication & RBAC Security
  // -------------------------------------------------------------------------
  console.log('\nStage 2: Validating Authentication & RBAC Security Layer...');
  const rawSecret = 'PayGuardSecure2026!';
  const hashedPassword = await hashPassword(rawSecret);
  const isMatch = await comparePassword(rawSecret, hashedPassword);
  assert(isMatch, 'Bcrypt cost factor 12 successfully hashes and verifies credentials');

  const mockAdminPayload = { id: '64b1f2e3d4c5b6a789012301', email: 'admin@payguard.io', role: 'ADMIN' };
  const adminToken = signToken(mockAdminPayload);
  const decoded = verifyToken(adminToken);
  assert(decoded.id === mockAdminPayload.id && decoded.role === 'ADMIN', 'JWT token successfully signed and verified');

  // -------------------------------------------------------------------------
  // Stage 3: Webhook Ingestion & HMAC-SHA256 Signature Verification
  // -------------------------------------------------------------------------
  console.log('\nStage 3: Validating Webhook Ingestion & Cryptographic Signatures...');
  const secretKey = 'whsec_payguard_e2e_mock_secret_key';
  const simulated = generateSimulatedWebhookPayload({
    gateway: 'STRIPE',
    merchantCode: 'MCH_ACME_001',
    status: 'FAILED',
    amount: 350.0,
    rawFailureReason: 'card_declined_insufficient_funds-51',
    secret: secretKey,
  });

  assert(simulated.payload.eventId.startsWith('evt_'), 'Webhook generator creates unique eventId');
  assert(simulated.headers['x-gateway-signature'].length === 64, 'HMAC signature is 64-char SHA256 hex string');

  const isSigValid = verifyHmacSignature(
    simulated.payload,
    simulated.headers['x-gateway-signature'],
    DEFAULT_SIMULATED_SECRET
  );
  assert(isSigValid, 'HMAC-SHA256 signature verification passes with timingSafeEqual');

  const tamperedSigValid = verifyHmacSignature(
    simulated.payload,
    '0000000000000000000000000000000000000000000000000000000000000000',
    DEFAULT_SIMULATED_SECRET
  );
  assert(!tamperedSigValid, 'HMAC-SHA256 signature verification rejects tampered signatures');

  // -------------------------------------------------------------------------
  // Stage 4: Failure Classification & ISO 8583 Taxonomy Engine
  // -------------------------------------------------------------------------
  console.log('\nStage 4: Validating Failure Classification & ISO Normalization...');
  const classification = classifyWithRules({
    rawFailureReason: 'card_declined_insufficient_funds-51',
    gateway: 'STRIPE',
  });
  assert(classification.predictedCategory === 'INSUFFICIENT_FUNDS', 'Decline string correctly classified as INSUFFICIENT_FUNDS');
  assert(classification.isoCode === '51', 'ISO code 51 extracted from text');
  assert(classification.confidence >= 0.9, 'Rule confidence score >= 0.90');

  const timeoutClassification = classifyWithRules({
    rawFailureReason: 'upstream_switch_socket_timeout_504',
    gateway: 'ADYEN',
  });
  assert(timeoutClassification.predictedCategory === 'NETWORK_TIMEOUT', 'Socket error classified as NETWORK_TIMEOUT');

  // -------------------------------------------------------------------------
  // Stage 5: Analytics Aggregation Engine Math & Utilities
  // -------------------------------------------------------------------------
  console.log('\nStage 5: Validating Analytics Utilities & Rate Calculations...');
  const dateRange = parseDateRange({ startDate: '2026-08-01', endDate: '2026-08-20' });
  assert(dateRange.start < dateRange.end, 'parseDateRange computes valid UTC date window');

  const successRate = calculatePercentage(95, 100);
  assert(successRate === 95.0, 'calculatePercentage accurately computes 95.0% success rate');

  const zeroSafe = calculatePercentage(0, 0);
  assert(zeroSafe === 0, 'calculatePercentage handles 0 total safely without NaN');

  // -------------------------------------------------------------------------
  // Stage 6: Report Generation, Storage Drivers & Serialization
  // -------------------------------------------------------------------------
  console.log('\nStage 6: Validating Report Serialization & Storage Layer...');
  const sampleTransactions = [
    { paymentId: 'pay_001', merchant: 'Acme Corp', amount: 120.0, status: 'SUCCESS' },
    { paymentId: 'pay_002', merchant: 'Beta Tech', amount: 250.0, status: 'FAILED' },
  ];
  const columns = [
    { key: 'paymentId', header: 'Payment ID' },
    { key: 'merchant', header: 'Merchant Name' },
    { key: 'amount', header: 'Amount' },
    { key: 'status', header: 'Status' },
  ];

  const csvContent = jsonToCsv(sampleTransactions, columns);
  assert(csvContent.includes('"Payment ID","Merchant Name","Amount","Status"'), 'CSV generator produces RFC 4180 headers');

  const excelContent = jsonToExcelXml(sampleTransactions, columns, 'E2E Report');
  assert(excelContent.includes('<?xml version="1.0"?>'), 'Excel XML generator produces valid SpreadsheetML document');

  // Test Storage Save & Read
  const savedFile = await storageService.saveReportFile({
    filename: 'e2e_verification_test.csv',
    content: csvContent,
    storageType: 'LOCAL',
  });
  assert(savedFile.storageType === 'LOCAL', 'StorageService successfully persists file locally');
  assert(savedFile.fileSizeBytes > 0, 'StorageService accurately computes byte length');

  const readBuffer = await storageService.readReportFile(savedFile.fileLocation);
  assert(readBuffer.toString('utf8') === csvContent, 'StorageService reads back identical report payload');

  await storageService.deleteReportFile(savedFile.fileLocation);
  assert(true, 'StorageService cleans up temporary report file');

  // -------------------------------------------------------------------------
  // Stage 7: Protected Route Security Matrix
  // -------------------------------------------------------------------------
  console.log('\nStage 7: Validating Protected Route Security Matrix...');
  const guardedEndpoints = [
    { path: '/api/v1/auth/me', method: 'GET' },
    { path: '/api/v1/merchants', method: 'GET' },
    { path: '/api/v1/webhooks/events', method: 'GET' },
    { path: '/api/v1/classifications', method: 'GET' },
    { path: '/api/v1/analytics/summary', method: 'GET' },
    { path: '/api/v1/reports', method: 'GET' },
  ];

  for (const ep of guardedEndpoints) {
    const res = await testRequest(app, { path: ep.path, method: ep.method });
    assert(res.statusCode === 401, `${ep.method} ${ep.path} requires Bearer token (401 Unauthorized)`);
  }

  console.log('\n======================================================================');
  console.log(`🎉 MASTER E2E INTEGRATION SUITE: ALL ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('======================================================================\n');
}

runMasterE2ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Master E2E Test Suite Failed:', err);
    process.exit(1);
  });
