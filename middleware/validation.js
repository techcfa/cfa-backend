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

// User registration validation
const validateUserRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('mobileNumber')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('mobileNumber')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// OTP validation
const validateOTP = [
  body('mobileNumber')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('otp')
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 4-6 digits'),
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
  body('additionalMembers.*.mobile')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
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
  validateUserRegistration,
  validateUserLogin,
  validateOTP,
  validateSubscription,
  validateMedia,
  handleValidationErrors
}; 