const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = 12;

/**
 * Hash plain text password using bcrypt
 * @param {string} password - Raw password
 * @param {number} [saltRounds=12] - Bcrypt cost factor
 * @returns {Promise<string>} Password hash
 */
const hashPassword = async (password, saltRounds = DEFAULT_SALT_ROUNDS) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword - Plain text candidate password
 * @param {string} hashedPassword - Stored bcrypt hash
 * @returns {Promise<boolean>} True if match
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
  if (!candidatePassword || !hashedPassword) return false;
  return bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
