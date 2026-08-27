const queueService = require('../services/queue.service');
const { handleClassificationJob } = require('./classification.worker');
const { QUEUE_JOB_TYPES } = require('../constants/enums');
const logger = require('../utils/logger');

/**
 * Registry of Job Type Handlers
 */
const JOB_HANDLERS = {
  [QUEUE_JOB_TYPES.CLASSIFICATION]: handleClassificationJob,

  // Minimal placeholders for downstream modules
  [QUEUE_JOB_TYPES.ANALYTICS]: async (job) => {
    logger.info(`[AnalyticsWorker] Processed analytics aggregation for payment ${job.payment}`);
    return { success: true, aggregated: true };
  },

  [QUEUE_JOB_TYPES.NOTIFICATION]: async (job) => {
    logger.info(`[NotificationWorker] Dispatched notification event '${job.payload?.event}' for payment ${job.payment}`);
    return { success: true, notified: true };
  },
};

/**
 * Process a single queue job with worker locking and error recovery
 * @param {string} workerId - Worker identifier
 * @returns {Promise<boolean>} True if a job was found and processed
 */
const processSingleJob = async (workerId = 'worker-1') => {
  const job = await queueService.fetchAndLockNextJob(workerId);
  if (!job) return false;

  const handler = JOB_HANDLERS[job.jobType];

  if (!handler) {
    logger.error(`No handler registered for job type: ${job.jobType}`);
    await queueService.failJob(job._id, `Unsupported job type: ${job.jobType}`);
    return true;
  }

  try {
    await handler(job);
    await queueService.completeJob(job._id);
    return true;
  } catch (err) {
    logger.error(`Failed to process job ${job.jobId} (${job.jobType}): ${err.message}`);
    await queueService.failJob(job._id, err);
    return true;
  }
};

/**
 * Process a batch of pending queue jobs
 * @param {object} options
 * @param {number} [options.limit=10] - Max jobs to drain
 * @param {string} [options.workerId='worker-batch']
 * @returns {Promise<{ processed: number, durationMs: number }>}
 */
const processQueueBatch = async ({ limit = 10, workerId = 'worker-batch' } = {}) => {
  const start = Date.now();
  let processed = 0;

  for (let i = 0; i < limit; i++) {
    const hasJob = await processSingleJob(workerId);
    if (!hasJob) break;
    processed++;
  }

  return {
    processed,
    durationMs: Date.now() - start,
  };
};

/**
 * Background Queue Polling Loop Controller
 */
class QueueWorkerEngine {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.workerId = `worker-${process.pid || 'main'}`;
  }

  start(intervalMs = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`🚀 PayGuard Queue Worker started (polling every ${intervalMs}ms, ID: ${this.workerId})`);

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await queueService.resetStaleLocks();
        await processQueueBatch({ limit: 5, workerId: this.workerId });
      } catch (err) {
        logger.error(`Queue worker polling loop error: ${err.message}`);
      }

      if (this.isRunning) {
        this.timer = setTimeout(poll, intervalMs);
      }
    };

    poll();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('🛑 PayGuard Queue Worker stopped.');
  }
}

const queueWorkerEngine = new QueueWorkerEngine();

module.exports = {
  processSingleJob,
  processQueueBatch,
  queueWorkerEngine,
};
