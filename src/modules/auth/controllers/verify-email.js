const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * POST /api/v1/auth/verify-email
 * Verify user's email address
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const userId = await tokenService.verifyEmailToken(token);
    await authService.verifyUserEmail(userId);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    if (err.message === "TOKEN_REQUIRED") {
      return res.status(400).json({
        status: "error",
        message: "Verification token is required.",
      });
    }
    if (err.message === "INVALID_TOKEN") {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired verification token.",
      });
    }
    logger.error({ err }, "Verify email error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = verifyEmail;
