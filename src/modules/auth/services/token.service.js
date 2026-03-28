const Token = require("../../../models/Token");
const { signAccessToken, signRefreshToken } = require("../../../helpers/jwt");
const { generateSecureToken, hashToken } = require("../../../helpers/crypto");

/**
 * Parse time string (e.g., "30s", "15m", "2h", "7d", "2w") to milliseconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days), w (weeks)
 */
const parseTimeToMs = (str) => {
  const units = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  const match = String(str).match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(
      `Invalid time string: "${str}". Expected format like "15m", "7d", "2w".`,
    );
  }
  return parseInt(match[1], 10) * units[match[2]] * 1000;
};

/**
 * Generate access and refresh tokens for a user
 */
const generateTokenPair = async (userId) => {
  const accessToken = signAccessToken(userId);
  const rawRefreshToken = generateSecureToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  await Token.create({
    user: userId,
    token: hashedRefreshToken,
    type: "refresh",
    expiresAt: new Date(Date.now() + parseTimeToMs(refreshExpiry)),
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

/**
 * Validate and rotate a refresh token.
 * Deletes the old token and returns the associated userId.
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("REFRESH_TOKEN_REQUIRED");
  }

  const hashed = hashToken(refreshToken);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: "refresh",
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  // Rotate: invalidate old token before issuing a new pair
  await Token.deleteOne({ _id: tokenDoc._id });

  return tokenDoc.user;
};

/**
 * Revoke a single refresh token (logout)
 */
const revokeRefreshToken = async (refreshToken) => {
  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    await Token.deleteOne({ token: hashed, type: "refresh" });
  }
};

/**
 * Revoke all refresh tokens for a user (e.g. after password change)
 */
const revokeAllUserTokens = async (userId) => {
  await Token.deleteMany({ user: userId, type: "refresh" });
};

/**
 * Create and store an email verification token (valid for 24 hours)
 */
const createEmailVerificationToken = async (userId) => {
  const rawToken = generateSecureToken();
  await Token.create({
    user: userId,
    token: hashToken(rawToken),
    type: "emailVerification",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return rawToken;
};

/**
 * Verify an email verification token.
 * Deletes the token on success and returns the associated userId.
 */
const verifyEmailToken = async (token) => {
  if (!token) {
    throw new Error("TOKEN_REQUIRED");
  }

  const hashed = hashToken(token);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: "emailVerification",
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error("INVALID_TOKEN");
  }

  await Token.deleteOne({ _id: tokenDoc._id });
  return tokenDoc.user;
};

/**
 * Create and store a password reset token (valid for 1 hour).
 * Any existing reset tokens for the user are deleted first.
 */
const createPasswordResetToken = async (userId) => {
  // Invalidate any previous reset tokens before creating a new one
  await Token.deleteMany({ user: userId, type: "passwordReset" });

  const rawToken = generateSecureToken();
  await Token.create({
    user: userId,
    token: hashToken(rawToken),
    type: "passwordReset",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return rawToken;
};

/**
 * Verify a password reset token.
 * Does NOT delete the token — call invalidatePasswordResetAndRefreshTokens after the reset.
 */
const verifyPasswordResetToken = async (token) => {
  if (!token) {
    throw new Error("TOKEN_REQUIRED");
  }

  const hashed = hashToken(token);
  const tokenDoc = await Token.findOne({
    token: hashed,
    type: "passwordReset",
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new Error("INVALID_TOKEN");
  }

  return tokenDoc.user;
};

/**
 * Invalidate all password reset tokens and refresh tokens for a user.
 * Called after a successful password reset to force re-login on all devices.
 */
const invalidatePasswordResetAndRefreshTokens = async (userId) => {
  await Token.deleteMany({
    user: userId,
    type: { $in: ["passwordReset", "refresh"] },
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
