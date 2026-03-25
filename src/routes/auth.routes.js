const { Router } = require('express');
const { body } = require('express-validator');
const router = Router();

const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');

// ─── Validators ──────────────────────────────────────────────────────────────

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const loginValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];

const updateMeValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
];

// ─── Public Routes ────────────────────────────────────────────────────────────

router.post('/register', authLimiter, registerValidators, validate, ctrl.register);
router.post('/verify-email', authLimiter, ctrl.verifyEmail);
router.post('/login', authLimiter, loginValidators, validate, ctrl.login);
router.post('/refresh-token', authLimiter, ctrl.refreshToken);
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, ctrl.resetPassword);

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.patch('/me', protect, updateMeValidators, validate, ctrl.updateMe);
router.patch('/change-password', protect, changePasswordValidators, validate, ctrl.changePassword);

module.exports = router;
