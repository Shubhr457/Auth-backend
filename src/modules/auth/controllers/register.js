const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * POST /api/v1/auth/register
 * Register a new user account
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await authService.registerUser({ name, email, password });

    // Create email verification token
    const verificationToken = await tokenService.createEmailVerificationToken(
      user._id,
    );

    // Send verification email (fire and forget)
    authService.sendVerificationEmailToUser(user, verificationToken);

    res.status(201).json({
      status: "success",
      message:
        "Registration successful! Please check your email to verify your account.",
    });
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      return res.status(409).json({
        status: "error",
        message: "Email already registered.",
      });
    }
    logger.error({ err }, "Register error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = register;
