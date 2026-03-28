const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * POST /api/v1/auth/reset-password
 * Reset password using token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const userId = await tokenService.verifyPasswordResetToken(token);
    await authService.resetUserPassword(userId, newPassword);

    // Invalidate the reset token and all refresh tokens
    await tokenService.invalidatePasswordResetAndRefreshTokens(userId);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully. Please log in.",
    });
  } catch (err) {
    if (err.message === "TOKEN_REQUIRED") {
      return res.status(400).json({
        status: "error",
        message: "Reset token is required.",
      });
    }
    if (err.message === "INVALID_TOKEN") {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired password reset token.",
      });
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(400).json({
        status: "error",
        message: "User not found.",
      });
    }
    logger.error({ err }, "Reset password error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = resetPassword;
