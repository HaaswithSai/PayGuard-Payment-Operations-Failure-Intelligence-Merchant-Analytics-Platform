const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payguard';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'development' ? 'debug' : 'info');

// Authentication & JWT
const JWT_SECRET = process.env.JWT_SECRET || 'payguard_dev_secret_key_123456789_enterprise';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Rate limiting configurations
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 mins
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000; // 1000 requests per window

// ML Microservice URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_SERVICE_TIMEOUT_MS = parseInt(process.env.ML_SERVICE_TIMEOUT_MS, 10) || 2000;

const env = Object.freeze({
  NODE_ENV,
  PORT,
  MONGODB_URI,
  CORS_ORIGIN,
  LOG_LEVEL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  ML_SERVICE_URL,
  ML_SERVICE_TIMEOUT_MS,
  isProduction: NODE_ENV === 'production',
  isDevelopment: NODE_ENV === 'development',
  isTest: NODE_ENV === 'test',
});

module.exports = env;
