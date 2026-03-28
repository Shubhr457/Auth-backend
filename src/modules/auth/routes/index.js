const { Router } = require("express");
const router = Router();

const controllers = require("../controllers");
const { protect } = require("../../../middlewares/auth");
const { authLimiter } = require("../../../middlewares/rateLimiter");
const validateDto = require("../../../middlewares/validateDto");
const dto = require("../dto");

// ─── Public Routes ────────────────────────────────────────────────────────────

router.post(
  "/register",
  authLimiter,
  validateDto(dto.registerDto),
  controllers.register,
);

router.post(
  "/verify-email",
  authLimiter,
  validateDto(dto.verifyEmailDto),
  controllers.verifyEmail,
);

router.post(
  "/login",
  authLimiter,
  validateDto(dto.loginDto),
  controllers.login,
);

// Refresh token is read from the httpOnly cookie — no body validation needed
router.post("/refresh-token", authLimiter, controllers.refreshToken);

router.post(
  "/forgot-password",
  authLimiter,
  validateDto(dto.forgotPasswordDto),
  controllers.forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validateDto(dto.resetPasswordDto),
  controllers.resetPassword,
);

// ─── Protected Routes ─────────────────────────────────────────────────────────

// Refresh token is read from the httpOnly cookie — no body validation needed
router.post("/logout", protect, controllers.logout);

router.get("/me", protect, controllers.getMe);

router.patch(
  "/me",
  protect,
  validateDto(dto.updateMeDto),
  controllers.updateMe,
);

router.patch(
  "/change-password",
  protect,
  validateDto(dto.changePasswordDto),
  controllers.changePassword,
);

module.exports = router;
