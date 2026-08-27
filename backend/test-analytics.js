/**
 * PayGuard Analytics Engine & Metrics Test Suite
 * Validates:
 * - Date range parsing and boundary sanitization
 * - Safe percentage and rate calculations
 * - MongoDB date grouping formats (hour, day, week, month)
 * - Analytics query validators (startDate, endDate, groupBy, limit, gateway)
 * - Authentication and RBAC guards on all 9 analytics endpoints
 */

const http = require('http');
const { app, env, enums } = require('./src');
const {
  parseDateRange,
  calculatePercentage,
  buildDateGroupFormat,
} = require('./src/utils/analytics.utils');
const { validateAnalyticsQuery } = require('./src/validators/analytics.validator');

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

async function runAnalyticsTests() {
  console.log('====================================================');
  console.log('PAYGUARD ANALYTICS & METRICS AGGREGATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Test Date Range Utilities
  console.log('1. Testing Date Range Utilities...');
  const range1 = parseDateRange({});
  assert(range1.start instanceof Date && range1.end instanceof Date, 'parseDateRange returns valid Date instances');
  assert(range1.start < range1.end, 'start date is earlier than end date');

  const range2 = parseDateRange({ startDate: '2026-08-01', endDate: '2026-08-15' });
  assert(range2.start.toISOString().startsWith('2026-08-01'), 'parseDateRange respects custom startDate');
  assert(range2.end.toISOString().startsWith('2026-08-15'), 'parseDateRange respects custom endDate');

  // 2. Test Safe Percentage Calculations
  console.log('\n2. Testing Safe Rate & Percentage Utilities...');
  const rate1 = calculatePercentage(25, 100);
  assert(rate1 === 25.0, 'calculatePercentage computes 25/100 as 25.0%');

  const rate2 = calculatePercentage(1, 3, 2);
  assert(rate2 === 33.33, 'calculatePercentage rounds 1/3 to 33.33%');

  const zeroRate = calculatePercentage(0, 0);
  assert(zeroRate === 0, 'calculatePercentage handles 0 total safely without NaN/Infinity');

  // 3. Test Date Grouping Formatter
  console.log('\n3. Testing Date Grouping Formats...');
  assert(buildDateGroupFormat('hour') === '%Y-%m-%d %H:00', 'buildDateGroupFormat(hour) returns hourly MongoDB pattern');
  assert(buildDateGroupFormat('day') === '%Y-%m-%d', 'buildDateGroupFormat(day) returns daily MongoDB pattern');
  assert(buildDateGroupFormat('week') === '%Y-W%V', 'buildDateGroupFormat(week) returns weekly MongoDB pattern');
  assert(buildDateGroupFormat('month') === '%Y-%m', 'buildDateGroupFormat(month) returns monthly MongoDB pattern');

  // 4. Test Analytics Query Validator
  console.log('\n4. Testing Analytics Query Validator...');

  // Invalid date format
  let invalidDateErr = null;
  validateAnalyticsQuery({ query: { startDate: 'invalid-date-xyz' } }, {}, (err) => {
    invalidDateErr = err;
  });
  assert(
    invalidDateErr && invalidDateErr.statusCode === 400 && invalidDateErr.code === 'INVALID_QUERY_PARAMS',
    'validateAnalyticsQuery rejects malformed startDate'
  );

  // Invalid groupBy
  let invalidGroupByErr = null;
  validateAnalyticsQuery({ query: { groupBy: 'decade' } }, {}, (err) => {
    invalidGroupByErr = err;
  });
  assert(invalidGroupByErr && invalidGroupByErr.statusCode === 400, 'validateAnalyticsQuery rejects invalid groupBy');

  // Invalid limit
  let invalidLimitErr = null;
  validateAnalyticsQuery({ query: { limit: '500' } }, {}, (err) => {
    invalidLimitErr = err;
  });
  assert(invalidLimitErr && invalidLimitErr.statusCode === 400, 'validateAnalyticsQuery rejects limit > 100');

  // Valid query
  let validQueryErr = null;
  validateAnalyticsQuery(
    {
      query: {
        startDate: '2026-08-01',
        endDate: '2026-08-20',
        groupBy: 'day',
        limit: '25',
        gateway: 'STRIPE',
      },
    },
    {},
    (err) => {
      validQueryErr = err;
    }
  );
  assert(!validQueryErr, 'validateAnalyticsQuery accepts valid query parameters');

  // 5. Test HTTP Analytics Endpoints & Auth Guards
  console.log('\n5. Testing HTTP Analytics Endpoints...');

  const endpoints = [
    '/api/v1/analytics/summary',
    '/api/v1/analytics/payments-trend',
    '/api/v1/analytics/failures-by-category',
    '/api/v1/analytics/failures-by-gateway',
    '/api/v1/analytics/failures-by-bank',
    '/api/v1/analytics/merchant-performance',
    '/api/v1/analytics/top-failure-reasons',
    '/api/v1/analytics/queue-stats',
    '/api/v1/analytics/recent-activity',
  ];

  for (const endpoint of endpoints) {
    const res = await testRequest(app, { path: endpoint, method: 'GET' });
    assert(res.statusCode === 401, `GET ${endpoint} without token is guarded with 401 Unauthorized`);
  }

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} ANALYTICS TESTS PASSED!`);
  console.log('====================================================\n');
}

runAnalyticsTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Analytics Tests Failed:', err);
    process.exit(1);
  });
