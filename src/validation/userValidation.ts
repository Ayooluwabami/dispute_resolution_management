import Joi from 'joi';

export const userValidation = {
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),
    lastName: Joi.string().min(2).max(50).required()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      }),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required()
      .messages({
        'string.pattern.base': 'Phone number must be in E.164 format (e.g., +2348065040593)',
        'any.required': 'Phone number is required'
      }),
    password: Joi.string().min(8).required()
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      })
  }),

  verifyOTP: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: Joi.string().min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords must match'
      })
  }),

  adminInvite: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'arbitrator').required()
  }),

  adminRegister: Joi.object({
    token: Joi.string().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    password: Joi.string().min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
  }),

  resendOTP: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      })
  })
};