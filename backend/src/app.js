const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const merchantRoutes = require('./routes/merchant.routes');
const webhookRoutes = require('./routes/webhook.routes');
const classificationRoutes = require('./routes/classification.routes');
const queueRoutes = require('./routes/queue.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// 1. Security Headers Middleware
app.use(helmet());

// 2. CORS Middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id', 'X-Request-Id', 'X-Gateway-Signature', 'Stripe-Signature'],
  })
);

// 3. Global Rate Limiter
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});
app.use('/api', limiter);

// 4. Body Parsers & Compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request Logger
app.use(requestLogger);

// 6. Root & Health Check Routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'payguard-backend',
    message: 'PayGuard Payment Operations & Analytics Platform API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    endpoints: {
      health: '/health',
      apiV1Health: '/api/v1/health',
      auth: '/api/v1/auth',
      merchants: '/api/v1/merchants',
      webhooks: '/api/v1/webhooks',
      classifications: '/api/v1/classifications',
      queue: '/api/v1/queue',
      analytics: '/api/v1/analytics',
      reports: '/api/v1/reports',
    },
  });
});

app.use('/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/classifications', classificationRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportRoutes);

// 7. 404 Catch-All Middleware
app.use(notFound);

// 8. Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
