const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Email-only flows for OTP login
const validateEmailOnly = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  handleValidationErrors
];

const validateEmailOTP = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit code'),
  handleValidationErrors
];

// Sign-up validation
const validateSignup = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Forgot password request validation
const validateForgotPasswordRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit code'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

// Subscription validation
const validateSubscription = [
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required'),
  body('additionalMembers')
    .optional()
    .isArray()
    .withMessage('Additional members must be an array'),
  body('additionalMembers.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Member name must be between 2 and 50 characters'),
  body('additionalMembers.*.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  handleValidationErrors
];

// Media validation
const validateMedia = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('type')
    .isIn(['article', 'video', 'banner', 'update'])
    .withMessage('Invalid media type'),
  body('content')
    .notEmpty()
    .withMessage('Content is required'),
  handleValidationErrors
];

module.exports = {
  validateEmailOnly,
  validateEmailOTP,
  validateSignup,
  validateLogin,
  validateForgotPasswordRequest,
  validateResetPassword,
  validateSubscription,
  validateMedia,
  handleValidationErrors
}; 