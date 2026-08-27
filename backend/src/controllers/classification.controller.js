const asyncHandler = require('../utils/asyncHandler');
const classificationService = require('../services/classification.service');
const queueService = require('../services/queue.service');
const { processQueueBatch } = require('../workers/queue.worker');

/**
 * Extract request context for audit logging
 */
const getRequestContext = (req) => ({
  requestId: req.headers['x-request-id'] || null,
  correlationId: req.headers['x-correlation-id'] || null,
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'] || null,
});

/**
 * @route   GET /api/v1/classifications
 * @desc    List failure classifications with category and confidence filters
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const listClassifications = asyncHandler(async (req, res) => {
  const result = await classificationService.listClassifications({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.classifications.length,
    pagination: result.pagination,
    classifications: result.classifications,
  });
});

/**
 * @route   GET /api/v1/classifications/:paymentId
 * @desc    Get failure classification for a specific payment
 * @access  Private (Admin, Support, Merchant [scoped])
 */
const getClassificationByPaymentId = asyncHandler(async (req, res) => {
  const classification = await classificationService.getClassificationByPaymentId(
    req.params.paymentId,
    req.user
  );

  res.status(200).json({
    success: true,
    classification,
  });
});

/**
 * @route   PATCH /api/v1/classifications/:paymentId/override
 * @desc    Manually override the failure category of a classified payment
 * @access  Private (Admin, Support Only)
 */
const overrideClassification = asyncHandler(async (req, res) => {
  const { predictedCategory, isoCode } = req.body;

  const classification = await classificationService.overrideClassification({
    paymentId: req.params.paymentId,
    predictedCategory,
    isoCode,
    actorUser: req.user,
    requestContext: getRequestContext(req),
  });

  res.status(200).json({
    success: true,
    message: 'Failure classification overridden successfully',
    classification,
  });
});

/**
 * @route   GET /api/v1/queue/jobs
 * @desc    List background processing queue jobs
 * @access  Private (Admin, Support Only)
 */
const listQueueJobs = asyncHandler(async (req, res) => {
  const result = await queueService.listJobs({
    actorUser: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: result.jobs.length,
    pagination: result.pagination,
    jobs: result.jobs,
  });
});

/**
 * @route   GET /api/v1/queue/jobs/:id
 * @desc    Get single queue job details
 * @access  Private (Admin, Support Only)
 */
const getQueueJobById = asyncHandler(async (req, res) => {
  const job = await queueService.getJobById(req.params.id);

  res.status(200).json({
    success: true,
    job,
  });
});

/**
 * @route   POST /api/v1/queue/process
 * @desc    Manually trigger a batch processing drain of the queue
 * @access  Private (Admin, Support Only)
 */
const triggerProcessQueue = asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const result = await processQueueBatch({ limit, workerId: `api-trigger-${req.user.role}` });

  res.status(200).json({
    success: true,
    message: `Processed ${result.processed} background jobs`,
    result,
  });
});

module.exports = {
  listClassifications,
  getClassificationByPaymentId,
  overrideClassification,
  listQueueJobs,
  getQueueJobById,
  triggerProcessQueue,
};
