const classificationService = require('../services/classification.service');
const logger = require('../utils/logger');

/**
 * Worker Handler: Processes CLASSIFICATION jobs from the ProcessingQueue
 * @param {object} job - ProcessingQueue document
 * @returns {Promise<object>} Processing outcome
 */
const handleClassificationJob = async (job) => {
  const { payment: paymentId, payload } = job;

  logger.info(`[ClassificationWorker] Processing job ${job.jobId} for payment ${paymentId}`);

  const classification = await classificationService.classifyPaymentFailure({
    paymentId,
    requestContext: {
      requestId: `queue_${job.jobId}`,
      correlationId: `job_${job._id}`,
    },
  });

  logger.info(
    `[ClassificationWorker] Payment ${paymentId} classified as '${classification.predictedCategory}' (ISO: ${classification.isoCode || 'N/A'}, Confidence: ${classification.confidence}, Source: ${classification.source})`
  );

  return {
    success: true,
    classificationId: classification._id,
    predictedCategory: classification.predictedCategory,
    isoCode: classification.isoCode,
  };
};

module.exports = {
  handleClassificationJob,
};
