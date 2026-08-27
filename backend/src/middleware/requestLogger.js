const morgan = require('morgan');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Custom Morgan token for structured request logging
 */
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Avoid logging sensitive raw passwords
    const sanitized = { ...req.body };
    if (sanitized.password) sanitized.password = '***REDACTED***';
    if (sanitized.passwordHash) sanitized.passwordHash = '***REDACTED***';
    if (sanitized.webhookSecret) sanitized.webhookSecret = '***REDACTED***';
    return JSON.stringify(sanitized);
  }
  return '';
});

// Format definition: Method URL Status ResponseTime - RemoteAddr
const devFormat = ':method :url :status :response-time ms - :res[content-length]';
const prodFormat = '{"method":":method","url":":url","status"::status,"responseTime":":response-time ms","remoteAddr":":remote-addr"}';

const requestLogger = morgan(env.isProduction ? prodFormat : devFormat, {
  stream: logger.stream,
  skip: (req) => req.url === '/health' && req.method === 'GET' && env.isProduction, // Optionally skip high-frequency health probes in prod
});

module.exports = requestLogger;
