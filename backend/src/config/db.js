const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

/**
 * Mongoose Connection Options
 * Production-ready pooling, timeout, and failover configurations.
 */
const mongooseOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  autoIndex: !env.isProduction, // Disable auto-indexing in production for performance
};

let isConnected = false;

/**
 * Connect to MongoDB instance
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB connection already established.');
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, mongooseOptions);
    isConnected = true;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Failed: ${error.message}`, { error });
    // In production/startup, a database connection failure is critical
    if (env.isProduction) {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Gracefully disconnect from MongoDB
 */
const disconnectDB = async () => {
  if (!isConnected) return;

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully.');
  } catch (error) {
    logger.error(`Error during MongoDB disconnection: ${error.message}`);
  }
};

// Event Listeners for MongoDB connection lifecycle
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB connection lost. Attempting auto-reconnect...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB runtime connection error: ${err.message}`);
});

module.exports = {
  connectDB,
  disconnectDB,
};
