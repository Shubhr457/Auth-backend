const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

// Match the cookie max-age to the refresh token expiry
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * POST /api/v1/auth/login
 * Authenticate user, return access token in body and refresh token as httpOnly cookie.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.authenticateUser(email, password);
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
      user._id,
    );

    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.status(200).json({
      status: "success",
      data: {
        accessToken,
        user: authService.formatUserResponse(user),
      },
    });
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }
    if (err.message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({
        status: "error",
        message: "Please verify your email before logging in.",
      });
    }
    logger.error({ err }, "Login error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = login;
