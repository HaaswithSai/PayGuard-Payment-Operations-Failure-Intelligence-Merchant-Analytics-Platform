const { FAILURE_CATEGORIES } = require('../constants/enums');

/**
 * ISO 8583 Standard Response Codes Taxonomy
 */
const ISO_8583_MAP = Object.freeze({
  '51': {
    category: FAILURE_CATEGORIES.INSUFFICIENT_FUNDS,
    description: 'Insufficient funds / over credit limit',
    confidence: 1.0,
  },
  '54': {
    category: FAILURE_CATEGORIES.CARD_EXPIRED,
    description: 'Expired card',
    confidence: 1.0,
  },
  '05': {
    category: FAILURE_CATEGORIES.AUTHENTICATION_FAILED,
    description: 'Do not honor / general decline',
    confidence: 0.9,
  },
  '57': {
    category: FAILURE_CATEGORIES.INVALID_DETAILS,
    description: 'Transaction not permitted to cardholder',
    confidence: 0.95,
  },
  '59': {
    category: FAILURE_CATEGORIES.FRAUD_SUSPECTED,
    description: 'Suspected fraud / risk filter',
    confidence: 0.98,
  },
  '61': {
    category: FAILURE_CATEGORIES.LIMIT_EXCEEDED,
    description: 'Exceeds withdrawal amount limit',
    confidence: 0.95,
  },
  '65': {
    category: FAILURE_CATEGORIES.LIMIT_EXCEEDED,
    description: 'Exceeds withdrawal frequency limit',
    confidence: 0.95,
  },
  '14': {
    category: FAILURE_CATEGORIES.INVALID_DETAILS,
    description: 'Invalid card number (no such number / Luhn check failure)',
    confidence: 0.95,
  },
  '82': {
    category: FAILURE_CATEGORIES.AUTHENTICATION_FAILED,
    description: 'Incorrect CVV / CVC verification',
    confidence: 0.98,
  },
  '91': {
    category: FAILURE_CATEGORIES.SYSTEM_ERROR,
    description: 'Issuer or switch is inoperative',
    confidence: 0.95,
  },
  '96': {
    category: FAILURE_CATEGORIES.SYSTEM_ERROR,
    description: 'System malfunction',
    confidence: 0.95,
  },
  TO: {
    category: FAILURE_CATEGORIES.NETWORK_TIMEOUT,
    description: 'Issuer / network response timeout',
    confidence: 0.95,
  },
  GW: {
    category: FAILURE_CATEGORIES.GATEWAY_ERROR,
    description: 'Payment gateway communication failure',
    confidence: 0.95,
  },
});

/**
 * Keyword Heuristics Dictionary
 */
const KEYWORD_TAXONOMY_RULES = [
  {
    category: FAILURE_CATEGORIES.INSUFFICIENT_FUNDS,
    isoCode: '51',
    confidence: 0.95,
    keywords: [
      'insufficient funds',
      'not enough funds',
      'low balance',
      'nsf',
      'over limit',
      'credit limit',
      'balance insufficient',
      'card declined insufficient funds',
      'insufficient_funds',
      'balance_exceeded',
    ],
  },
  {
    category: FAILURE_CATEGORIES.CARD_EXPIRED,
    isoCode: '54',
    confidence: 0.95,
    keywords: [
      'expired',
      'expiration',
      'card expired',
      'expired card',
      'card_expired',
      'validity expired',
    ],
  },
  {
    category: FAILURE_CATEGORIES.AUTHENTICATION_FAILED,
    isoCode: '05',
    confidence: 0.9,
    keywords: [
      '3ds',
      '3d secure',
      'otp',
      'authentication failed',
      'auth failed',
      'pin incorrect',
      'incorrect cvv',
      'cvc check failed',
      'security code',
      'do not honor',
      'do_not_honor',
      'declined by issuer',
      'customer canceled',
      'auth_rejected',
    ],
  },
  {
    category: FAILURE_CATEGORIES.FRAUD_SUSPECTED,
    isoCode: '59',
    confidence: 0.98,
    keywords: [
      'fraud',
      'stolen',
      'lost card',
      'restricted card',
      'high risk',
      'blocklist',
      'blacklist',
      'sanction',
      'pickup card',
      'suspected fraud',
      'fraudulent',
      'risk score exceeded',
    ],
  },
  {
    category: FAILURE_CATEGORIES.NETWORK_TIMEOUT,
    isoCode: 'TO',
    confidence: 0.95,
    keywords: [
      'timeout',
      'timed out',
      'gateway timeout',
      'issuer timeout',
      'socket timeout',
      'network error',
      'connection reset',
      'econnreset',
      'etimedout',
      'gateway timeout 504',
      'no response from bank',
    ],
  },
  {
    category: FAILURE_CATEGORIES.LIMIT_EXCEEDED,
    isoCode: '61',
    confidence: 0.92,
    keywords: [
      'limit exceeded',
      'daily limit',
      'velocity limit',
      'exceeds frequency',
      'max amount exceeded',
      'transaction limit',
      'spending limit',
    ],
  },
  {
    category: FAILURE_CATEGORIES.INVALID_DETAILS,
    isoCode: '14',
    confidence: 0.92,
    keywords: [
      'invalid card',
      'invalid number',
      'invalid routing',
      'luhn check',
      'invalid expiry',
      'incorrect number',
      'no such card',
      'invalid card number',
      'invalid cvc',
      'invalid account',
    ],
  },
  {
    category: FAILURE_CATEGORIES.GATEWAY_ERROR,
    isoCode: 'GW',
    confidence: 0.9,
    keywords: [
      'gateway error',
      'processor error',
      'gateway unavailable',
      'upstream error',
      'gateway reject',
      'gateway error 502',
      'gateway rejected request',
    ],
  },
  {
    category: FAILURE_CATEGORIES.SYSTEM_ERROR,
    isoCode: '96',
    confidence: 0.9,
    keywords: [
      'system error',
      'internal error',
      'malfunction',
      'switch inoperative',
      'issuer unavailable',
      'internal server error 500',
      'database error',
      'system malfunction',
    ],
  },
];

module.exports = {
  ISO_8583_MAP,
  KEYWORD_TAXONOMY_RULES,
};
