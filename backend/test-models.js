/**
 * PayGuard Data Model Architecture Validation Suite
 * Runs offline Mongoose schema validation tests to verify:
 * - Schema definitions, types, defaults, and embedded subdocuments
 * - Custom validators, required fields, and enum constraints
 * - Index definitions across all 8 models
 * - Relationships and virtual definitions
 */

const mongoose = require('mongoose');
const {
  User,
  Merchant,
  WebhookEvent,
  Payment,
  FailureClassification,
  ProcessingQueue,
  AuditLog,
  Report,
  enums,
} = require('./src');

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

async function runModelValidationTests() {
  console.log('====================================================');
  console.log('PAYGUARD MODEL ARCHITECTURE TEST SUITE');
  console.log('====================================================\n');

  // Test 1: User Model Validation
  console.log('1. Testing User Model...');
  const dummyMerchantId = new mongoose.Types.ObjectId();

  const validAdmin = new User({
    name: 'Platform Administrator',
    email: 'admin@payguard.internal',
    passwordHash: '$2b$12$e8Ym...hashed',
    role: enums.USER_ROLES.ADMIN,
    status: enums.USER_STATUS.ACTIVE,
  });
  const adminValidationErr = validAdmin.validateSync();
  assert(!adminValidationErr, 'Admin user passes schema validation without merchant ref');

  const validMerchantUser = new User({
    name: 'Acme Operations Lead',
    email: 'ops@acme.com',
    passwordHash: '$2b$12$e8Ym...hashed',
    role: enums.USER_ROLES.MERCHANT,
    status: enums.USER_STATUS.ACTIVE,
    merchant: dummyMerchantId,
    failedLoginAttempts: 0,
    lastPasswordChange: new Date(),
  });
  const merchantUserValidationErr = validMerchantUser.validateSync();
  assert(!merchantUserValidationErr, 'Merchant user with valid merchant ref passes validation');

  const invalidMerchantUser = new User({
    name: 'Invalid Merchant User',
    email: 'invalid@acme.com',
    passwordHash: '$2b$12$e8Ym...hashed',
    role: enums.USER_ROLES.MERCHANT,
    merchant: null, // Should fail custom validator
  });
  const invalidUserErr = invalidMerchantUser.validateSync();
  assert(
    invalidUserErr && invalidUserErr.errors['merchant'],
    'User with role MERCHANT must provide a merchant reference'
  );

  // Test 2: Merchant Model Validation
  console.log('\n2. Testing Merchant Model...');
  const validMerchant = new Merchant({
    merchantCode: 'MCH_ACME_001',
    name: 'Acme Payments Corp',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1-555-0199',
    status: enums.MERCHANT_STATUS.ACTIVE,
    configuration: {
      supportedGateways: [enums.PAYMENT_GATEWAYS.STRIPE, enums.PAYMENT_GATEWAYS.ADYEN],
      defaultCurrency: 'USD',
      webhookSecret: 'whsec_test_secret_key_123',
      retryPolicy: {
        maxRetries: 5,
        backoffFactorMs: 1500,
        timeoutMs: 8000,
      },
      customSettings: {
        autoRefundOnFraud: true,
        riskThresholdScore: 85,
      },
    },
    createdBy: validAdmin._id,
  });
  const merchantErr = validMerchant.validateSync();
  assert(!merchantErr, 'Merchant with extensible configuration subdocument passes validation');
  assert(
    validMerchant.configuration.retryPolicy.maxRetries === 5,
    'Merchant retryPolicy subdocument preserves properties'
  );

  // Test 3: WebhookEvent Model Validation
  console.log('\n3. Testing WebhookEvent Model...');
  const validWebhook = new WebhookEvent({
    eventId: 'evt_stripe_simulated_987654',
    gateway: enums.PAYMENT_GATEWAYS.STRIPE,
    webhookHeaders: {
      'stripe-signature': 't=1600000000,v1=987...abc',
      'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
    },
    rawPayload: {
      id: 'evt_stripe_simulated_987654',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_1234567890',
          amount: 25000,
          currency: 'usd',
          last_payment_error: {
            code: 'card_declined',
            decline_code: 'insufficient_funds',
            message: 'Your card has insufficient funds.',
          },
        },
      },
    },
    signature: 't=1600000000,v1=987...abc',
    processingStatus: enums.WEBHOOK_STATUS.RECEIVED,
    retryCount: 0,
    merchant: validMerchant._id,
  });
  const webhookErr = validWebhook.validateSync();
  assert(!webhookErr, 'WebhookEvent with raw headers and payload passes validation');
  assert(validWebhook.processingStatus === 'RECEIVED', 'WebhookEvent default processingStatus is RECEIVED');

  // Test 4: Payment Model Validation
  console.log('\n4. Testing Payment Model (Decoupled & Structured Metadata)...');
  const validPayment = new Payment({
    paymentId: 'pay_txn_987654321',
    merchant: validMerchant._id,
    gateway: enums.PAYMENT_GATEWAYS.STRIPE,
    issuingBank: 'JPMorgan Chase',
    amount: 250.0,
    currency: 'USD',
    status: enums.PAYMENT_STATUS.PROCESSING,
    rawFailureReason: 'Your card has insufficient funds (decline_code: insufficient_funds)',
    idempotencyKey: 'idemp_key_stripe_pi_1234567890',
    gatewayEventId: 'evt_stripe_simulated_987654',
    customerRef: 'cust_acme_user_55',
    metadata: {
      gatewayPayload: { paymentIntentId: 'pi_1234567890' },
      customerInfo: {
        customerId: 'cust_acme_user_55',
        email: 'shopper@example.com',
        phone: '+1-555-0100',
        name: 'Jane Doe',
        ipAddress: '198.51.100.42',
      },
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Windows',
        deviceFingerprint: 'dfp_99a8b7c6',
        ip: '198.51.100.42',
      },
      networkInfo: {
        routingNumber: '021000021',
        rrn: '123456789012',
        arn: '74512345678901234567890',
        bin: '411111',
        cardBrand: 'VISA',
        cardType: 'CREDIT',
        cardLast4: '1111',
      },
      custom: {
        checkoutSessionId: 'cs_test_abc123',
      },
    },
    processedAt: new Date(),
  });
  const paymentErr = validPayment.validateSync();
  assert(!paymentErr, 'Payment with structured metadata and lifecycle status PROCESSING passes validation');
  assert(validPayment.issuingBank === 'JPMorgan Chase', 'Payment correctly uses issuingBank naming');
  assert(validPayment.exchangeRate === 1.0, 'Payment default exchangeRate is 1.0');
  assert(validMerchant.isDeleted === false, 'Merchant default isDeleted is false');
  assert(validMerchantUser.isDeleted === false, 'User default isDeleted is false');

  // Verify negative amount validation
  const invalidPayment = new Payment({
    paymentId: 'pay_invalid',
    merchant: validMerchant._id,
    gateway: enums.PAYMENT_GATEWAYS.STRIPE,
    amount: -50,
    currency: 'USD',
    idempotencyKey: 'idemp_invalid',
  });
  const invalidPaymentErr = invalidPayment.validateSync();
  assert(
    invalidPaymentErr && invalidPaymentErr.errors['amount'],
    'Payment rejects negative monetary amounts'
  );

  // Test 5: FailureClassification Model Validation
  console.log('\n5. Testing FailureClassification Model...');
  const validClassification = new FailureClassification({
    payment: validPayment._id,
    rawText: 'Your card has insufficient funds (decline_code: insufficient_funds)',
    normalizedText: 'card decline insufficient funds account balance low',
    predictedCategory: enums.FAILURE_CATEGORIES.INSUFFICIENT_FUNDS,
    isoCode: '51', // ISO 8583 Insufficient Funds
    confidence: 0.985,
    source: enums.FAILURE_SOURCES.ML,
    modelVersion: 'payguard-fail-classifier-v2.1',
    reviewedBy: null,
    reviewedAt: null,
  });
  const classErr = validClassification.validateSync();
  assert(!classErr, 'FailureClassification passes validation with ISO 8583 code and ML confidence');

  // Test confidence bound checking
  const invalidConfidence = new FailureClassification({
    payment: validPayment._id,
    rawText: 'error',
    predictedCategory: enums.FAILURE_CATEGORIES.SYSTEM_ERROR,
    confidence: 1.5, // > 1.0 invalid
  });
  const invConfErr = invalidConfidence.validateSync();
  assert(
    invConfErr && invConfErr.errors['confidence'],
    'FailureClassification rejects confidence values greater than 1.0'
  );

  // Test 6: ProcessingQueue Model Validation
  console.log('\n6. Testing ProcessingQueue Model...');
  const validJob = new ProcessingQueue({
    payment: validPayment._id,
    jobType: enums.QUEUE_JOB_TYPES.CLASSIFICATION,
    status: enums.QUEUE_JOB_STATUS.PENDING,
    priority: 10,
    maxRetries: 3,
    scheduledAt: new Date(),
    payload: {
      rawFailureReason: validPayment.rawFailureReason,
      gateway: validPayment.gateway,
    },
  });
  const jobErr = validJob.validateSync();
  assert(!jobErr, 'ProcessingQueue job passes validation');
  assert(validJob.jobId && validJob.jobId.startsWith('job_'), 'ProcessingQueue auto-generates unique jobId');

  // Test 7: AuditLog Model Validation (Tracing & Snapshot)
  console.log('\n7. Testing AuditLog Model...');
  const validAudit = new AuditLog({
    actorUser: validAdmin._id,
    actorRole: enums.AUDIT_ACTOR_ROLES.ADMIN,
    action: enums.AUDIT_ACTIONS.MERCHANT_CONFIG_UPDATE,
    entityType: 'Merchant',
    entityId: validMerchant._id.toString(),
    requestId: 'req_trace_987654321',
    correlationId: 'corr_trace_e0f1a2b3-c4d5-6789',
    beforeSnapshot: { status: 'INACTIVE' },
    afterSnapshot: { status: 'ACTIVE' },
    ipAddress: '192.0.2.1',
    userAgent: 'PayGuard-AdminConsole/1.0',
    metadata: { reason: 'Merchant KYC and underwriting approved' },
  });
  const auditErr = validAudit.validateSync();
  assert(!auditErr, 'AuditLog passes validation with requestId, correlationId, and snapshots');

  // Test 8: Report Model Validation (Storage-Agnostic)
  console.log('\n8. Testing Report Model...');
  const validReport = new Report({
    reportType: enums.REPORT_TYPES.FAILURE_ANALYSIS,
    filtersUsed: {
      merchantId: validMerchant._id.toString(),
      dateRange: { start: '2026-08-01', end: '2026-08-27' },
      failureCategory: enums.FAILURE_CATEGORIES.INSUFFICIENT_FUNDS,
    },
    generatedBy: validAdmin._id,
    storageType: enums.STORAGE_TYPES.S3,
    fileLocation: 's3://payguard-enterprise-reports/2026/08/failure-analysis-mch-001.csv',
    format: enums.REPORT_FORMATS.CSV,
    status: enums.REPORT_STATUS.READY,
    fileSizeBytes: 1048576,
    rowCount: 5420,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const reportErr = validReport.validateSync();
  assert(!reportErr, 'Report passes validation with S3 cloud storage location');

  // Test 9: Index Verification
  console.log('\n9. Verifying Mongoose Schema Indexes...');
  const checkIndexes = (model, expectedIndexKeys, modelName) => {
    const indexes = model.schema.indexes();
    for (const expected of expectedIndexKeys) {
      const match = indexes.some(([fields]) => {
        return Object.keys(expected).every(k => fields[k] !== undefined);
      });
      assert(match, `${modelName} contains index covering [${Object.keys(expected).join(', ')}]`);
    }
  };

  checkIndexes(User, [{ email: 1 }, { role: 1, status: 1 }, { merchant: 1 }, { isDeleted: 1 }], 'User');
  checkIndexes(Merchant, [{ status: 1 }, { name: 1 }, { createdAt: -1 }, { isDeleted: 1 }], 'Merchant');
  checkIndexes(WebhookEvent, [{ processingStatus: 1 }, { gateway: 1 }, { payment: 1 }, { receivedAt: 1 }], 'WebhookEvent');
  checkIndexes(
    Payment,
    [
      { merchant: 1, status: 1 },
      { gateway: 1 },
      { issuingBank: 1 },
      { createdAt: -1 },
    ],
    'Payment'
  );
  checkIndexes(
    FailureClassification,
    [{ predictedCategory: 1 }, { source: 1, confidence: 1 }, { isoCode: 1 }],
    'FailureClassification'
  );
  checkIndexes(
    ProcessingQueue,
    [{ status: 1, scheduledAt: 1 }, { payment: 1, jobType: 1 }],
    'ProcessingQueue'
  );
  checkIndexes(
    AuditLog,
    [{ entityType: 1, entityId: 1 }, { correlationId: 1 }, { requestId: 1 }],
    'AuditLog'
  );
  checkIndexes(
    Report,
    [{ generatedBy: 1 }, { reportType: 1 }, { expiresAt: 1 }],
    'Report'
  );

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} MODEL TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runModelValidationTests()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
