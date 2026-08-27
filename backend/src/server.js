const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { seedSuperAdmin } = require('./config/seed');
const logger = require('./utils/logger');

let server;

/**
 * Bootstrap and Start PayGuard Backend Server
 */
const startServer = async () => {
  try {
    // 1. Establish Database Connection & Auto-Seed Demo Accounts
    await connectDB();
    await seedSuperAdmin();

    // 2. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info('====================================================');
      logger.info(`🛡️  PAYGUARD BACKEND SERVER RUNNING`);
      logger.info(`🌐 Environment : ${env.NODE_ENV}`);
      logger.info(`🚀 Port        : ${env.PORT}`);
      logger.info(`🩺 Health Check: http://localhost:${env.PORT}/health`);
      logger.info('====================================================');
    });
  } catch (error) {
    logger.error(`Fatal Server Startup Error: ${error.message}`, { error });
    process.exit(1);
  }
};

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Process terminated gracefully.');
      process.exit(0);
    });

    // Force close after 10 seconds timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Process-level event handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
  // In production, trigger graceful exit so orchestrator (Docker/PM2/K8s) restarts the pod
  if (env.isProduction) {
    gracefulShutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error });
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
startServer();

module.exports = { app, startServer };
