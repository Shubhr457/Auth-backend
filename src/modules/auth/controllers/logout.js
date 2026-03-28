const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * POST /api/v1/auth/logout
 * Revoke the refresh token stored in the httpOnly cookie and clear it.
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    await tokenService.revokeRefreshToken(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      status: "success",
      message: "Logged out successfully.",
    });
  } catch (err) {
    logger.error({ err }, "Logout error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = logout;
