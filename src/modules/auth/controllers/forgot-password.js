const User = require('../../../models/User');
const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');

/**
 * POST /api/v1/auth/forgot-password
 * Send password reset email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Always return same response (prevent email enumeration)
    const successMsg = 'If that email exists, a reset link has been sent.';

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ status: 'success', message: successMsg });
    }

    const resetToken = await tokenService.createPasswordResetToken(user._id);
    authService.sendPasswordResetEmailToUser(user, resetToken);

    res.status(200).json({ status: 'success', message: successMsg });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = forgotPassword;
