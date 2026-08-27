const winston = require('winston');

const logLevel = process.env.LOG_LEVEL || 'info';

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  process.env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let log = `[${timestamp}] ${level}: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          if (stack) {
            log += `\n${stack}`;
          }
          return log;
        })
      )
);

const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Stream adapter for Morgan HTTP request logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
