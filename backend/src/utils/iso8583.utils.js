const { ISO_8583_MAP } = require('../data/failureRules');

/**
 * Look up ISO 8583 mapping by exact code
 * @param {string} code - e.g. '51', '54', '05'
 * @returns {object|null} Classification descriptor or null
 */
const lookupIsoCode = (code) => {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  return ISO_8583_MAP[cleanCode] || null;
};

/**
 * Extract ISO 8583 code from raw failure text if present
 * e.g., "declined with code 51" -> "51"
 * @param {string} text - Raw failure string
 * @returns {string|null} ISO code string or null
 */
const extractIsoCodeFromText = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Check common ISO pattern tokens (e.g., "iso 51", "code 54", "iso_51", "decline_51")
  const isoPattern = /(?:iso|code|decline|response)[\s_-]*([0-9]{2}|to|gw)/i;
  const match = text.match(isoPattern);

  if (match && match[1]) {
    const candidate = match[1].toUpperCase();
    if (ISO_8583_MAP[candidate]) {
      return candidate;
    }
  }

  // Check standalone 2-digit codes if whole word is known code
  const tokens = text.split(/[\s_\-:]+/);
  for (const token of tokens) {
    const candidate = token.toUpperCase();
    if (ISO_8583_MAP[candidate]) {
      return candidate;
    }
  }

  return null;
};

module.exports = {
  lookupIsoCode,
  extractIsoCodeFromText,
};
