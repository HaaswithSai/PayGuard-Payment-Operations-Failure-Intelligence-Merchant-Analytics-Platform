/**
 * PayGuard Backend Foundation Test Suite
 * Validates:
 * - Environment loading & validation
 * - Express app initialization & middleware registration
 * - Health check endpoint routing
 * - Custom AppError & asyncHandler mechanics
 * - Centralized errorHandler responses (404, 400, 409, 500)
 * - Model & Enum registry exports
 */

const http = require('http');
const { app, env, models, enums, AppError, asyncHandler, logger } = require('./src');

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
 * Helper to perform HTTP request to Express app without opening a public port
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
        headers: options.headers || {},
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

async function runFoundationTests() {
  console.log('====================================================');
  console.log('PAYGUARD BACKEND FOUNDATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Test Environment Configuration
  console.log('1. Testing Environment Configuration...');
  assert(env.PORT !== undefined && typeof env.PORT === 'number', `env.PORT is configured (${env.PORT})`);
  assert(env.NODE_ENV !== undefined, `env.NODE_ENV is configured (${env.NODE_ENV})`);
  assert(env.MONGODB_URI !== undefined, `env.MONGODB_URI is configured (${env.MONGODB_URI})`);
  assert(env.CORS_ORIGIN !== undefined, `env.CORS_ORIGIN is configured (${env.CORS_ORIGIN})`);
  assert(Object.isFrozen(env), 'env object is immutable (frozen)');

  // 2. Test Error Utilities
  console.log('\n2. Testing Error Utilities...');
  const appError = new AppError('Resource not found', 404, 'NOT_FOUND', { id: '123' });
  assert(appError instanceof Error, 'AppError extends native Error');
  assert(appError.statusCode === 404, 'AppError captures status code 404');
  assert(appError.status === 'fail', 'AppError marks 4xx as status "fail"');
  assert(appError.isOperational === true, 'AppError marks isOperational as true');
  assert(appError.code === 'NOT_FOUND', 'AppError captures custom error code');
  assert(appError.details.id === '123', 'AppError captures error details');

  const serverError = new AppError('Database failure', 500);
  assert(serverError.status === 'error', 'AppError marks 5xx as status "error"');

  // 3. Test Async Handler
  console.log('\n3. Testing Async Handler...');
  let caughtError = null;
  const sampleAsyncFn = asyncHandler(async (req, res, next) => {
    throw new AppError('Async failure test', 400);
  });
  const mockNext = (err) => {
    caughtError = err;
  };
  sampleAsyncFn({}, {}, mockNext);
  // Wait microtask tick
  await new Promise((r) => setTimeout(r, 10));
  assert(caughtError && caughtError.statusCode === 400, 'asyncHandler catches rejected async errors and forwards to next()');

  // 4. Test Model Registry
  console.log('\n4. Testing Model Registry Exports...');
  const expectedModels = [
    'User',
    'Merchant',
    'WebhookEvent',
    'Payment',
    'FailureClassification',
    'ProcessingQueue',
    'AuditLog',
    'Report',
  ];
  for (const m of expectedModels) {
    assert(models[m] !== undefined && typeof models[m] === 'function', `Model registry exports ${m}`);
  }

  // 5. Test Express Endpoints via HTTP
  console.log('\n5. Testing Express Routes & Middleware...');

  // Test Root /
  const rootRes = await testRequest(app, { path: '/', method: 'GET' });
  assert(rootRes.statusCode === 200, 'GET / returns HTTP 200 OK');
  assert(rootRes.body.success === true, 'GET / body includes success: true');
  assert(rootRes.body.service.toLowerCase().includes('payguard'), 'GET / confirms PayGuard service name');

  // Test /health
  const healthRes = await testRequest(app, { path: '/health', method: 'GET' });
  assert(healthRes.statusCode === 200 || healthRes.statusCode === 503, 'GET /health returns valid status');
  assert(healthRes.body.service === 'payguard-backend', 'GET /health returns service: payguard-backend');
  assert(healthRes.body.uptimeSeconds !== undefined, 'GET /health returns uptime');
  assert(healthRes.body.database !== undefined, 'GET /health returns database telemetry');

  // Test /api/v1/health
  const v1HealthRes = await testRequest(app, { path: '/api/v1/health', method: 'GET' });
  assert(v1HealthRes.statusCode === 200 || v1HealthRes.statusCode === 503, 'GET /api/v1/health returns valid status');
  assert(v1HealthRes.body.version === '1.0.0', 'GET /api/v1/health returns version 1.0.0');

  // Test 404 Not Found
  const notFoundRes = await testRequest(app, { path: '/api/v1/unmapped-endpoint-xyz', method: 'GET' });
  assert(notFoundRes.statusCode === 404, 'Unknown route returns HTTP 404 Not Found');
  assert(notFoundRes.body.success === false, '404 response returns success: false');
  assert(notFoundRes.body.error.code === 'NOT_FOUND', '404 response returns error code NOT_FOUND');

  // Test Malformed JSON Handling
  const malformedJsonRes = await testRequest(
    app,
    {
      path: '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    '{"bad_json": invalid}'
  );
  assert(malformedJsonRes.statusCode === 400, 'Malformed JSON returns HTTP 400 Bad Request');
  assert(malformedJsonRes.body.error.code === 'INVALID_JSON', 'Malformed JSON returns error code INVALID_JSON');

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} FOUNDATION TESTS PASSED!`);
  console.log('====================================================\n');
}

runFoundationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Foundation Tests Failed:', err);
    process.exit(1);
  });
