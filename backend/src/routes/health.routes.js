const express = require('express');
const mongoose = require('mongoose');
const env = require('../config/env');

const router = express.Router();

const readyStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * @route   GET /health or /api/v1/health
 * @desc    Service health, database connectivity, and uptime telemetry
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbHealthy = dbState === 1;

  const healthData = {
    success: true,
    status: isDbHealthy ? 'healthy' : 'degraded',
    service: 'payguard-backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: readyStateMap[dbState] || 'unknown',
      readyState: dbState,
    },
    system: {
      memoryUsageMB: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      nodeVersion: process.version,
    },
  };

  const statusCode = isDbHealthy ? 200 : 503;
  res.status(statusCode).json(healthData);
});

module.exports = router;
