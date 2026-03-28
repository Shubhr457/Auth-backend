const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * PATCH /api/v1/auth/change-password
 * Change authenticated user's password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await authService.changeUserPassword(
      req.user._id,
      currentPassword,
      newPassword,
    );

    // Revoke all refresh tokens, force re-login on all devices
    await tokenService.revokeAllUserTokens(req.user._id);

    res.status(200).json({
      status: "success",
      message: "Password changed successfully. Please log in again.",
    });
  } catch (err) {
    if (err.message === "INCORRECT_PASSWORD") {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect.",
      });
    }
    logger.error({ err }, "Change password error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = changePassword;
