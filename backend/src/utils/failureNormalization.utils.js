const { FAILURE_CATEGORIES, FAILURE_SOURCES } = require('../constants/enums');
const { KEYWORD_TAXONOMY_RULES } = require('../data/failureRules');
const { normalizeFailureText } = require('./textNormalization.utils');
const { lookupIsoCode, extractIsoCodeFromText } = require('./iso8583.utils');

/**
 * Classify a raw failure reason using rule-based and ISO 8583 taxonomy mappings
 * @param {object} params
 * @param {string} params.rawFailureReason - Raw error message from gateway
 * @param {string} [params.gateway] - Gateway identifier (STRIPE, ADYEN, etc.)
 * @param {string} [params.issuingBank] - Bank name
 * @param {object} [params.metadata] - Extra metadata containing gateway codes
 * @returns {object} Normalized classification object
 */
const classifyWithRules = ({ rawFailureReason, gateway = null, issuingBank = null, metadata = {} } = {}) => {
  const rawText = rawFailureReason || metadata?.gatewayPayload?.decline_code || metadata?.gatewayPayload?.reason || '';
  const normalizedText = normalizeFailureText(rawText);

  // 1. Check direct ISO code in metadata or raw text
  const directCode = metadata?.gatewayPayload?.isoCode || metadata?.gatewayPayload?.responseCode;
  if (directCode) {
    const isoMatch = lookupIsoCode(directCode);
    if (isoMatch) {
      return {
        predictedCategory: isoMatch.category,
        isoCode: String(directCode).toUpperCase(),
        confidence: isoMatch.confidence,
        source: FAILURE_SOURCES.RULE_BASED,
        modelVersion: 'rule-engine-v1',
        normalizedText,
      };
    }
  }

  const extractedIsoCode = extractIsoCodeFromText(rawText);
  if (extractedIsoCode) {
    const isoMatch = lookupIsoCode(extractedIsoCode);
    if (isoMatch) {
      return {
        predictedCategory: isoMatch.category,
        isoCode: extractedIsoCode,
        confidence: isoMatch.confidence,
        source: FAILURE_SOURCES.RULE_BASED,
        modelVersion: 'rule-engine-v1',
        normalizedText,
      };
    }
  }

  // 2. Keyword Taxonomy Rule Match
  for (const rule of KEYWORD_TAXONOMY_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword)) {
        return {
          predictedCategory: rule.category,
          isoCode: rule.isoCode || null,
          confidence: rule.confidence,
          source: FAILURE_SOURCES.RULE_BASED,
          modelVersion: 'rule-engine-v1',
          normalizedText,
        };
      }
    }
  }

  // 3. Fallback for unclassified / ambiguous failures
  return {
    predictedCategory: FAILURE_CATEGORIES.OTHERS,
    isoCode: null,
    confidence: 0.5,
    source: FAILURE_SOURCES.RULE_BASED,
    modelVersion: 'rule-engine-v1',
    normalizedText,
  };
};

module.exports = {
  classifyWithRules,
};
