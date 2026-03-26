const Token = require('../../../models/Token');
const { signAccessToken, signRefreshToken } = require('../../../helpers/jwt');
const { generateSecureToken, hashToken } = require('../../../helpers/crypto');

/**
 * Parse time string (e.g., "15m", "7d") to milliseconds
 */
const parseTimeToMs = (str) => {
  const units = { m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([mhd])$/);
  if (!match) return 0;
  return parseInt(match[1]) * (units[match[2]] || 0) * 1000;
};

/**
 * Generate access and refresh tokens for a user
 */
const generateTokenPair = async (userId) => {
  const accessToken = signAccessToken(userId);
  const rawRefreshToken = generateSecureToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  await Token.create({
    user: userId,
    token: hashedRefreshToken,
    type: 'refresh',
    expiresAt: new Date(Date.now() + parseTimeToMs(refreshExpiry)),
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

/**
 * Validate and refresh an access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('REFRESH_TOKEN_REQUIRED');
  }

  const hashed = hashToken(refreshToken);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: 'refresh',
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  // Rotate: invalidate old token
  await Token.deleteOne({ _id: tokenDoc._id });

  return tokenDoc.user;
};

/**
 * Revoke a refresh token (logout)
 */
const revokeRefreshToken = async (refreshToken) => {
  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    await Token.deleteOne({ token: hashed, type: 'refresh' });
  }
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
  await Token.deleteMany({ user: userId, type: 'refresh' });
};

/**
 * Create email verification token
 */
const createEmailVerificationToken = async (userId) => {
  const rawToken = generateSecureToken();
  await Token.create({
    user: userId,
    token: hashToken(rawToken),
    type: 'emailVerification',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
  return rawToken;
};

/**
 * Verify email verification token
 */
const verifyEmailToken = async (token) => {
  if (!token) {
    throw new Error('TOKEN_REQUIRED');
  }

  const hashed = hashToken(token);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: 'emailVerification',
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error('INVALID_TOKEN');
  }

  await Token.deleteOne({ _id: tokenDoc._id });
  return tokenDoc.user;
};

/**
 * Create password reset token
 */
const createPasswordResetToken = async (userId) => {
  // Delete any existing password reset tokens
  await Token.deleteMany({ user: userId, type: 'passwordReset' });

  const rawToken = generateSecureToken();
  await Token.create({
    user: userId,
    token: hashToken(rawToken),
    type: 'passwordReset',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return rawToken;
};

/**
 * Verify password reset token
 */
const verifyPasswordResetToken = async (token) => {
  if (!token) {
    throw new Error('TOKEN_REQUIRED');
  }

  const hashed = hashToken(token);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: 'passwordReset',
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error('INVALID_TOKEN');
  }

  return tokenDoc.user;
};

/**
 * Invalidate password reset token and all refresh tokens
 */
const invalidatePasswordResetAndRefreshTokens = async (userId) => {
  await Token.deleteMany({ 
    user: userId, 
    type: { $in: ['passwordReset', 'refresh'] } 
  });
};

module.exports = {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  createEmailVerificationToken,
  verifyEmailToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  invalidatePasswordResetAndRefreshTokens,
};
