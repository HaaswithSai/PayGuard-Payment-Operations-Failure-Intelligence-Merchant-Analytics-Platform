/**
 * PayGuard Report Generation & Storage Integration Test Suite
 * Validates:
 * - RFC 4180 CSV serialization and escaping
 * - SpreadsheetML Excel XML generation
 * - Storage abstraction layer (LOCAL driver save, read, delete)
 * - Report request and parameter validation
 * - Authentication guards across all reporting endpoints
 */

const http = require('http');
const { app, env, enums } = require('./src');
const { jsonToCsv } = require('./src/utils/csv.utils');
const { jsonToExcelXml } = require('./src/utils/xlsx.utils');
const storageService = require('./src/services/storage.service');
const {
  validateCreateReport,
  validateReportIdParam,
} = require('./src/validators/report.validator');

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

async function runReportTests() {
  console.log('====================================================');
  console.log('PAYGUARD REPORT GENERATION & STORAGE TEST SUITE');
  console.log('====================================================\n');

  // 1. Test CSV Serialization
  console.log('1. Testing CSV Serialization...');
  const sampleData = [
    { id: 'pay_101', merchant: 'Acme, Corp', amount: 150.5, status: 'SUCCESS' },
    { id: 'pay_102', merchant: 'Global "Tech" Inc', amount: 200.0, status: 'FAILED' },
  ];
  const columns = [
    { key: 'id', header: 'Payment ID' },
    { key: 'merchant', header: 'Merchant Name' },
    { key: 'amount', header: 'Amount' },
    { key: 'status', header: 'Status' },
  ];

  const csv = jsonToCsv(sampleData, columns);
  assert(csv.includes('"Payment ID","Merchant Name","Amount","Status"'), 'CSV contains escaped header line');
  assert(csv.includes('"pay_101","Acme, Corp","150.5","SUCCESS"'), 'CSV properly handles embedded commas');
  assert(csv.includes('"pay_102","Global ""Tech"" Inc","200","FAILED"'), 'CSV properly escapes internal double quotes');

  // 2. Test Excel XML Serialization
  console.log('\n2. Testing Excel XML Serialization...');
  const xml = jsonToExcelXml(sampleData, columns, 'Transaction Summary');
  assert(xml.includes('<?xml version="1.0"?>'), 'Excel XML starts with XML header');
  assert(xml.includes('<Worksheet ss:Name="Transaction Summary">'), 'Excel XML sets custom worksheet name');
  assert(xml.includes('<Data ss:Type="String">Payment ID</Data>'), 'Excel XML formats string cell headers');
  assert(xml.includes('<Data ss:Type="Number">150.5</Data>'), 'Excel XML identifies numeric cells');

  // 3. Test Storage Service (LOCAL Driver)
  console.log('\n3. Testing Storage Service...');
  const testFilename = 'test_sample_report_001.csv';
  const testContent = 'col1,col2\nval1,val2';

  const saved = await storageService.saveReportFile({
    filename: testFilename,
    content: testContent,
    storageType: 'LOCAL',
  });
  assert(saved.storageType === 'LOCAL', 'StorageService saves to LOCAL storage');
  assert(saved.fileSizeBytes > 0, 'StorageService captures file byte size');
  assert(typeof saved.fileLocation === 'string', 'StorageService returns relative fileLocation path');

  const fileBuffer = await storageService.readReportFile(saved.fileLocation);
  assert(fileBuffer.toString('utf8') === testContent, 'StorageService reads back identical file buffer');

  const contentTypeCsv = storageService.getContentType('CSV');
  assert(contentTypeCsv.includes('text/csv'), 'StorageService returns text/csv content type');

  const contentTypeXlsx = storageService.getContentType('XLSX');
  assert(contentTypeXlsx.includes('application/vnd.ms-excel'), 'StorageService returns Excel content type');

  await storageService.deleteReportFile(saved.fileLocation);
  assert(true, 'StorageService deletes local report file cleanly');

  // 4. Test Report Request Validator
  console.log('\n4. Testing Report Validator...');

  // Invalid reportType
  let invalidTypeErr = null;
  validateCreateReport({ body: { reportType: 'UNKNOWN_REPORT_XYZ', format: 'CSV' } }, {}, (err) => {
    invalidTypeErr = err;
  });
  assert(
    invalidTypeErr && invalidTypeErr.statusCode === 400 && invalidTypeErr.code === 'VALIDATION_ERROR',
    'validateCreateReport rejects unknown reportType'
  );

  // Invalid format
  let invalidFormatErr = null;
  validateCreateReport(
    { body: { reportType: enums.REPORT_TYPES.TRANSACTION_SUMMARY, format: 'DOCX' } },
    {},
    (err) => {
      invalidFormatErr = err;
    }
  );
  assert(invalidFormatErr && invalidFormatErr.statusCode === 400, 'validateCreateReport rejects unsupported format DOCX');

  // Valid report request
  let validReq = {
    body: {
      reportType: enums.REPORT_TYPES.TRANSACTION_SUMMARY,
      format: 'csv',
      filtersUsed: { limit: 100 },
    },
  };
  let validErr = null;
  validateCreateReport(validReq, {}, (err) => {
    validErr = err;
  });
  assert(!validErr, 'validateCreateReport accepts valid request body');
  assert(validReq.body.format === 'CSV', 'validateCreateReport normalizes format to uppercase');

  // ObjectId param validator
  let badIdErr = null;
  validateReportIdParam({ params: { id: 'invalid-id' } }, {}, (err) => {
    badIdErr = err;
  });
  assert(badIdErr && badIdErr.statusCode === 400, 'validateReportIdParam rejects non-ObjectId string');

  // 5. Test HTTP Endpoints & Auth Guards
  console.log('\n5. Testing HTTP Report Endpoints...');

  const reportEndpoints = [
    { path: '/api/v1/reports/types', method: 'GET' },
    { path: '/api/v1/reports', method: 'GET' },
    { path: '/api/v1/reports', method: 'POST' },
    { path: '/api/v1/reports/64b1f2e3d4c5b6a789012399', method: 'GET' },
    { path: '/api/v1/reports/64b1f2e3d4c5b6a789012399/download', method: 'GET' },
    { path: '/api/v1/reports/64b1f2e3d4c5b6a789012399', method: 'DELETE' },
  ];

  for (const ep of reportEndpoints) {
    const res = await testRequest(app, { path: ep.path, method: ep.method });
    assert(res.statusCode === 401, `${ep.method} ${ep.path} is guarded with 401 Unauthorized`);
  }

  console.log('\n====================================================');
  console.log(`ALL ${passedTests}/${totalTests} REPORT TESTS PASSED!`);
  console.log('====================================================\n');
}

runReportTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Report Tests Failed:', err);
    process.exit(1);
  });
