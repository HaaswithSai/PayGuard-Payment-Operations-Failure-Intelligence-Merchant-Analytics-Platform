const logger = require('../utils/logger');
const env = require('../config/env');
const { FAILURE_SOURCES } = require('../constants/enums');

/**
 * ML Microservice Client Bridge
 * Communicates with the Python FastAPI ML microservice when online,
 * with seamless fallback to deterministic rule engine when offline.
 */
class MlClientService {
  constructor() {
    this.serviceUrl = env.ML_SERVICE_URL || null;
    this.timeoutMs = env.ML_SERVICE_TIMEOUT_MS || 2000;
  }

  /**
   * Request classification prediction from Python ML Microservice
   * @param {object} params
   * @param {string} params.rawText - Raw failure text
   * @param {string} params.gateway - Payment Gateway (STRIPE, ADYEN, etc.)
   * @param {string} params.issuingBank - Bank name
   * @param {object} params.metadata - Contextual metadata
   * @returns {Promise<object|null>} ML prediction or null if offline/unavailable
   */
  async predict({ rawText, gateway = null, issuingBank = null, metadata = {} }) {
    if (!this.serviceUrl) {
      // ML service is not configured; fallback cleanly
      return null;
    }

    try {
      // Prepared HTTP bridge for future ML container
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.serviceUrl}/api/v1/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          gateway,
          issuingBank,
          metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`ML Service returned status ${response.status}. Falling back to rule engine.`);
        return null;
      }

      const data = await response.json();
      return {
        predictedCategory: data.category,
        isoCode: data.isoCode || null,
        confidence: data.confidence || 0.85,
        source: FAILURE_SOURCES.ML,
        modelVersion: data.modelVersion || 'ml-classifier-v1',
        normalizedText: data.normalizedText || '',
      };
    } catch (err) {
      logger.warn(`ML microservice unreachable (${err.message}). Using rule-based fallback.`);
      return null;
    }
  }
}

module.exports = new MlClientService();
