const Joi = require('joi');

/**
 * Register DTO
 * Validates user registration data
 */
const registerDto = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Valid email required',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
      'any.required': 'Password is required',
    }),
});

/**
 * Login DTO
 * Validates login credentials
 */
const loginDto = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Valid email required',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Verify Email DTO
 * Validates email verification token
 */
const verifyEmailDto = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required',
    }),
});

/**
 * Refresh Token DTO
 * Validates refresh token request
 */
const refreshTokenDto = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

/**
 * Forgot Password DTO
 * Validates forgot password request
 */
const forgotPasswordDto = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Valid email required',
      'any.required': 'Email is required',
    }),
});

/**
 * Reset Password DTO
 * Validates password reset with token
 */
const resetPasswordDto = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
      'any.required': 'New password is required',
    }),
});

/**
 * Change Password DTO
 * Validates password change request
 */
const changePasswordDto = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
      'any.required': 'New password is required',
    }),
});

/**
 * Update Profile DTO
 * Validates profile update request
 */
const updateMeDto = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'Valid email required',
    }),
}).min(1).messages({
  'object.min': 'At least one field (name or email) must be provided',
});

module.exports = {
  registerDto,
  loginDto,
  verifyEmailDto,
  refreshTokenDto,
  forgotPasswordDto,
  resetPasswordDto,
  changePasswordDto,
  updateMeDto,
};
