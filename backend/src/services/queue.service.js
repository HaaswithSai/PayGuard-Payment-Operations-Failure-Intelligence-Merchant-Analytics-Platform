const { ProcessingQueue, AuditLog } = require('../models');
const { QUEUE_JOB_STATUS, QUEUE_JOB_TYPES, AUDIT_ACTOR_ROLES } = require('../constants/enums');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Service: Job Queue Management and Worker Locking
 */
class QueueService {
  /**
   * Atomically fetch and lock the next pending job
   * @param {string} workerId - Unique worker process identifier
   * @param {string[]} [allowedTypes] - Filter job types
   * @returns {Promise<Document|null>} Locked job document or null
   */
  async fetchAndLockNextJob(workerId = 'worker-default', allowedTypes = null) {
    const filter = {
      status: QUEUE_JOB_STATUS.PENDING,
      scheduledAt: { $lte: new Date() },
    };

    if (allowedTypes && Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      filter.jobType = { $in: allowedTypes };
    }

    const job = await ProcessingQueue.findOneAndUpdate(
      filter,
      {
        $set: {
          status: QUEUE_JOB_STATUS.PROCESSING,
          lockedAt: new Date(),
          lockedBy: workerId,
        },
      },
      {
        sort: { priority: -1, scheduledAt: 1 },
        new: true,
      }
    );

    return job;
  }

  /**
   * Mark a job as successfully completed
   * @param {string} jobId - ProcessingQueue _id or jobId
   * @returns {Promise<Document>} Updated job
   */
  async completeJob(jobId) {
    const job = await ProcessingQueue.findOneAndUpdate(
      { $or: [{ _id: jobId }, { jobId }] },
      {
        $set: {
          status: QUEUE_JOB_STATUS.COMPLETED,
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      },
      { new: true }
    );

    return job;
  }

  /**
   * Mark a job as failed with exponential backoff retry scheduling
   * @param {string} jobId - ProcessingQueue _id or jobId
   * @param {Error|string} error - Error instance or message
   * @returns {Promise<Document>} Updated job
   */
  async failJob(jobId, error) {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown processing error';

    const existing = await ProcessingQueue.findOne({ $or: [{ _id: jobId }, { jobId }] });
    if (!existing) return null;

    const newRetryCount = existing.retryCount + 1;
    const isExhausted = newRetryCount >= existing.maxRetries;

    const update = {
      errorMessage,
      retryCount: newRetryCount,
      lockedAt: null,
      lockedBy: null,
    };

    if (isExhausted) {
      update.status = QUEUE_JOB_STATUS.FAILED;
      logger.warn(`Job ${existing.jobId} permanently failed after ${newRetryCount} attempts: ${errorMessage}`);
    } else {
      update.status = QUEUE_JOB_STATUS.PENDING;
      // Exponential backoff: 2s, 4s, 8s...
      const backoffMs = Math.pow(2, newRetryCount) * 1000;
      update.scheduledAt = new Date(Date.now() + backoffMs);
      logger.info(`Job ${existing.jobId} scheduled for retry #${newRetryCount} in ${backoffMs}ms`);
    }

    const updatedJob = await ProcessingQueue.findByIdAndUpdate(existing._id, { $set: update }, { new: true });
    return updatedJob;
  }

  /**
   * Reset stale locks (e.g. from crashed worker nodes)
   * @param {number} [staleThresholdMs=60000] - Lock timeout duration
   */
  async resetStaleLocks(staleThresholdMs = 60000) {
    const staleCutoff = new Date(Date.now() - staleThresholdMs);

    const result = await ProcessingQueue.updateMany(
      {
        status: QUEUE_JOB_STATUS.PROCESSING,
        lockedAt: { $lte: staleCutoff },
      },
      {
        $set: {
          status: QUEUE_JOB_STATUS.PENDING,
          lockedAt: null,
          lockedBy: null,
          errorMessage: 'Lock timeout: recovered by watchdog',
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.warn(`Watchdog recovered ${result.modifiedCount} stale locked jobs.`);
    }

    return result.modifiedCount;
  }

  /**
   * List queue jobs for operations monitoring
   */
  async listJobs({ actorUser, query = {} }) {
    const filter = {};
    if (query.status) filter.status = query.status.toUpperCase();
    if (query.jobType) filter.jobType = query.jobType.toUpperCase();
    if (query.paymentId) filter.payment = query.paymentId;

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ProcessingQueue.find(filter)
        .sort({ priority: -1, scheduledAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('payment', 'paymentId amount currency status')
        .lean(),
      ProcessingQueue.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get single job by ID
   */
  async getJobById(id) {
    const job = await ProcessingQueue.findById(id)
      .populate('payment', 'paymentId amount currency status rawFailureReason')
      .lean();

    if (!job) {
      throw new AppError(`Queue job with ID '${id}' not found`, 404, 'JOB_NOT_FOUND');
    }

    return job;
  }
}

module.exports = new QueueService();
