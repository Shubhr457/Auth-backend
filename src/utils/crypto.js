const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token (hex string)
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token using SHA-256 (for storing in DB instead of plaintext)
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { generateSecureToken, hashToken };
