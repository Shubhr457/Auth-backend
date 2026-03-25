const User = require('../models/User');
const Token = require('../models/Token');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const { generateSecureToken, hashToken } = require('../utils/crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ms = (str) => {
  const units = { m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([mhd])$/);
  if (!match) return 0;
  return parseInt(match[1]) * (units[match[2]] || 0) * 1000;
};

const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id);
  const rawRefreshToken = generateSecureToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  await Token.create({
    user: user._id,
    token: hashedRefreshToken,
    type: 'refresh',
    expiresAt: new Date(Date.now() + ms(refreshExpiry)),
  });

  res.status(statusCode).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    },
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ status: 'error', message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password });

    // Send email verification
    const rawToken = generateSecureToken();
    await Token.create({
      user: user._id,
      token: hashToken(rawToken),
      type: 'emailVerification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Fire and forget (don't block response on email)
    sendVerificationEmail({ to: email, name, token: rawToken }).catch(console.error);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ status: 'error', message: 'Verification token is required.' });
    }

    const hashed = hashToken(token);
    const tokenDoc = await Token.findOne({
      token: hashed,
      type: 'emailVerification',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired verification token.' });
    }

    await User.findByIdAndUpdate(tokenDoc.user, { isEmailVerified: true });
    await Token.deleteOne({ _id: tokenDoc._id });

    res.status(200).json({ status: 'success', message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ status: 'error', message: 'Please verify your email before logging in.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: 'Refresh token is required.' });
    }

    const hashed = hashToken(refreshToken);
    const tokenDoc = await Token.findOne({
      token: hashed,
      type: 'refresh',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
    }

    // Rotate: invalidate old token
    await Token.deleteOne({ _id: tokenDoc._id });

    const user = await User.findById(tokenDoc.user);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      await Token.deleteOne({ token: hashed, type: 'refresh' });
    }
    res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Always return same response (prevent email enumeration)
    const successMsg = 'If that email exists, a reset link has been sent.';

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ status: 'success', message: successMsg });
    }

    // Delete any existing password reset tokens
    await Token.deleteMany({ user: user._id, type: 'passwordReset' });

    const rawToken = generateSecureToken();
    await Token.create({
      user: user._id,
      token: hashToken(rawToken),
      type: 'passwordReset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    sendPasswordResetEmail({ to: email, name: user.name, token: rawToken }).catch(console.error);

    res.status(200).json({ status: 'success', message: successMsg });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashed = hashToken(token);
    const tokenDoc = await Token.findOne({
      token: hashed,
      type: 'passwordReset',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired password reset token.' });
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidate the reset token and all refresh tokens
    await Token.deleteMany({ user: user._id, type: { $in: ['passwordReset', 'refresh'] } });

    res.status(200).json({ status: 'success', message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * GET /api/v1/auth/me
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
        createdAt: req.user.createdAt,
      },
    },
  });
};

/**
 * PATCH /api/v1/auth/me
 */
exports.updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    // If email is being changed, check it's not taken
    if (email && email !== req.user.email) {
      const taken = await User.findOne({ email });
      if (taken) {
        return res.status(409).json({ status: 'error', message: 'Email already in use.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: { id: updated._id, name: updated.name, email: updated.email, role: updated.role },
      },
    });
  } catch (err) {
    console.error('UpdateMe error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

/**
 * PATCH /api/v1/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ status: 'error', message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens, force re-login
    await Token.deleteMany({ user: user._id, type: 'refresh' });

    res.status(200).json({ status: 'success', message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};
