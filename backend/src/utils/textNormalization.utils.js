/**
 * Normalize raw failure reason string into clean tokenized text
 * e.g., "card_declined_insufficient_funds-51!" -> "card declined insufficient funds 51"
 * @param {string} text - Raw failure message or error code
 * @returns {string} Normalized lowercase string
 */
const normalizeFailureText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .replace(/[_\-./:]+/g, ' ') // Replace delimiters with spaces
    .replace(/[^a-z0-9\s]/g, '') // Strip symbols/punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

module.exports = {
  normalizeFailureText,
};
