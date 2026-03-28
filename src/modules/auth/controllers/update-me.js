const authService = require("../services/auth.service");
const tokenService = require("../services/token.service");
const logger = require("../../../config/logger");

/**
 * PATCH /api/v1/auth/me
 * Update authenticated user's profile.
 * If the email address is changed the account is marked unverified and a new
 * verification email is sent — the user must confirm the new address before
 * they can log in again.
 */
const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    const { updated, emailChanged } = await authService.updateUserProfile(
      req.user._id,
      { name, email },
    );

    if (emailChanged) {
      const verificationToken = await tokenService.createEmailVerificationToken(
        updated._id,
      );
      authService.sendVerificationEmailToUser(updated, verificationToken);
    }

    res.status(200).json({
      status: "success",
      message: emailChanged
        ? "Profile updated. A verification email has been sent to your new address — please confirm it before logging in again."
        : "Profile updated successfully.",
      data: {
        user: authService.formatUserResponse(updated),
      },
    });
  } catch (err) {
    if (err.message === "EMAIL_IN_USE") {
      return res.status(409).json({
        status: "error",
        message: "Email already in use.",
      });
    }
    logger.error({ err }, "UpdateMe error");
    res
      .status(500)
      .json({ status: "error", message: "Internal server error." });
  }
};

module.exports = updateMe;
