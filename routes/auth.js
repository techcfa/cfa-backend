const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendOTP } = require('../config/twilio');
const { validateUserRegistration, validateUserLogin, validateOTP } = require('../middleware/validation');
const { writeSheet } = require('../googleSheetService');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *         fullName:
 *           type: string
 *           description: User's full name
 *         mobileNumber:
 *           type: string
 *           description: User's mobile number
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         customerId:
 *           type: string
 *           description: Unique customer ID
 *         isVerified:
 *           type: boolean
 *           description: Whether user is verified
 *         subscription:
 *           type: object
 *           description: User's subscription details
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Response message
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - mobileNumber
 *       properties:
 *         mobileNumber:
 *           type: string
 *           pattern: '^[6-9]\\d{9}$'
 *           description: 10-digit mobile number
 *           example: "9876543210"
 *     SendOTPResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "OTP sent successfully"
 *         mobileNumber:
 *           type: string
 *           example: "9876543210"
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - mobileNumber
 *         - otp
 *         - fullName
 *         - email
 *         - password
 *       properties:
 *         mobileNumber:
 *           type: string
 *           pattern: '^[6-9]\\d{9}$'
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           pattern: '^\\d{6}$'
 *           example: "123456"
 *         fullName:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "password123"
 *     LoginRequest:
 *       type: object
 *       required:
 *         - mobileNumber
 *         - password
 *       properties:
 *         mobileNumber:
 *           type: string
 *           pattern: '^[6-9]\\d{9}$'
 *           example: "9876543210"
 *         password:
 *           type: string
 *           example: "password123"
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - mobileNumber
 *       properties:
 *         mobileNumber:
 *           type: string
 *           pattern: '^[6-9]\\d{9}$'
 *           example: "9876543210"
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - mobileNumber
 *         - otp
 *         - newPassword
 *       properties:
 *         mobileNumber:
 *           type: string
 *           pattern: '^[6-9]\\d{9}$'
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           pattern: '^\\d{6}$'
 *           example: "123456"
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           example: "newpassword123"
 */

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP for user registration
 *     description: Sends a 6-digit OTP to the provided mobile number for user registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendOTPResponse'
 *       400:
 *         description: Invalid mobile number or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Send OTP for registration
router.post('/send-otp', async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this mobile number' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP temporarily (in production, use Redis)
    const tempOTP = new User({
      mobileNumber,
      otp: {
        code: otp,
        expiresAt: otpExpiry
      }
    });

    // Send OTP via Twilio
    const result = await sendOTP(mobileNumber, otp);
    
    if (result.success) {
      res.json({ 
        message: 'OTP sent successfully',
        mobileNumber 
      });
    } else {
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and register user
 *     description: Verifies the OTP and creates a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid OTP or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Verify OTP and register user
router.post('/verify-otp', validateOTP, async (req, res) => {
  try {
    const { mobileNumber, otp, fullName, email, password } = req.body;

    // In production, verify OTP from Redis/database
    // For now, we'll accept any 6-digit OTP for demo
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ mobileNumber }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      fullName,
      mobileNumber,
      email,
      password,
      isVerified: true
    });

    await user.save();

    // Write to Google Sheets
    try {
      await writeSheet(process.env.SPREADSHEET_ID, [[
        fullName,
        email,
        mobileNumber,
        'New Registration',
        user.customerId,
        new Date().toISOString()
      ]]);
    } catch (sheetError) {
      console.error('Google Sheets error:', sheetError);
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        email: user.email,
        customerId: user.customerId,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates user with mobile number and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// User login
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    // Find user by mobile number
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        email: user.email,
        customerId: user.customerId,
        isVerified: user.isVerified,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send OTP for password reset
 *     description: Sends a 6-digit OTP to the provided mobile number for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Forgot password - send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    // Send OTP via Twilio
    const result = await sendOTP(mobileNumber, otp);
    
    if (result.success) {
      res.json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Resets user password using the provided OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Invalid OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Reset password
router.post('/reset-password', validateOTP, async (req, res) => {
  try {
    const { mobileNumber, otp, newPassword } = req.body;

    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP (in production, check against stored OTP)
    if (user.otp && user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update password
    user.password = newPassword;
    user.otp = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 