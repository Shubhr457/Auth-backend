const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * POST /api/v1/auth/refresh-token
 * Issue a new access token + rotate the refresh token cookie.
 */
const refreshToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

    const userId = await tokenService.refreshAccessToken(incomingRefreshToken);
    const user = await authService.getUserById(userId);
    const tokens = await tokenService.generateTokenPair(user._id);

    // Rotate the httpOnly refresh-token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    res.status(200).json({
      status: "success",
      data: {
        accessToken: tokens.accessToken,
        user: authService.formatUserResponse(user),
      },
    });
  } catch (err) {
    if (err.message === "REFRESH_TOKEN_REQUIRED") {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required.",
      });
    }
    if (err.message === "INVALID_REFRESH_TOKEN") {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token.",
      });
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(401).json({
        status: "error",
        message: "User not found.",
      });
    }
    logger.error({ err }, "Refresh token error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = refreshToken;
