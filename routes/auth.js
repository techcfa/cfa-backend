const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../config/mailer');
const { 
  validateEmailOnly, 
  validateEmailOTP,
  validateSignup,
  validateLogin,
  validateForgotPasswordRequest,
  validateResetPassword
} = require('../middleware/validation');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailSendOTPRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         fullName:
 *           type: string
 *           example: "John Doe"
 *     EmailVerifyOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         otp:
 *           type: string
 *           example: "123456"
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             fullName:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             customerId:
 *               type: string
 *             isVerified:
 *               type: boolean
 */

/**
 * @swagger
 * /api/auth/email/send-otp:
 *   post:
 *     summary: Send OTP to email for login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
// Internal handler to allow reuse for resend
const handleEmailSendOtp = async (req, res) => {
  try {
    const { email, fullName } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, fullName: fullName || '', isVerified: false });
    }

    const otp = generateOTP();
    user.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await user.save();

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:16px;color:#333">
        <p>Hi${user.fullName ? ' ' + user.fullName : ''},</p>
        <p>Your login code is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${otp}</p>
        <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Your login code',
      html
    });

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Email send OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

router.post('/email/send-otp', validateEmailOnly, handleEmailSendOtp);
// Explicit resend endpoint (same behavior)
router.post('/email/resend-otp', validateEmailOnly, handleEmailSendOtp);

/**
 * @swagger
 * /api/auth/email/verify-otp:
 *   post:
 *     summary: Verify OTP sent to email and log in
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerifyOTPRequest'
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Invalid OTP
 *       404:
 *         description: User not found
 */
router.post('/email/verify-otp', validateEmailOTP, async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp.code !== otp || new Date(user.otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.lastLogin = new Date();
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        customerId: user.customerId,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Email verify OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sign-up: send OTP with password capture
// Internal handler for signup send/resend
const handleSignupSendOtp = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    if (!user) {
      user = new User({ fullName, email, password, isVerified: false });
    } else {
      user.fullName = fullName;
      user.password = password; // will be hashed by pre-save hook
    }

    const otp = generateOTP();
    user.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await user.save();

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:16px;color:#333">
        <p>Hi ${fullName},</p>
        <p>Your verification code is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify your email',
      html
    });

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ message: 'OTP sent for verification' });
  } catch (error) {
    console.error('Signup send OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
router.post('/signup/send-otp', validateSignup, handleSignupSendOtp);
// Explicit resend endpoint (same behavior)
router.post('/signup/resend-otp', validateEmailOnly, handleSignupSendOtp);

// Sign-up: verify OTP and activate account
router.post('/signup/verify-otp', validateEmailOTP, async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp.code !== otp || new Date(user.otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.lastLogin = new Date();
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      message: 'Account verified successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        customerId: user.customerId,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Signup verify OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login with email and password
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email to continue' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        customerId: user.customerId,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot password: send OTP
// Internal handler for forgot-password send/resend
const handleForgotPasswordSendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await user.save();

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:16px;color:#333">
        <p>Hi${user.fullName ? ' ' + user.fullName : ''},</p>
        <p>Your password reset code is:</p>
        <p style=\"font-size:24px;font-weight:bold;letter-spacing:3px\">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Password reset code',
      html
    });

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send reset email' });
    }

    res.json({ message: 'Password reset OTP sent' });
  } catch (error) {
    console.error('Forgot password send OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
router.post('/forgot-password/send-otp', validateForgotPasswordRequest, handleForgotPasswordSendOtp);
// Explicit resend endpoint (same behavior)
router.post('/forgot-password/resend-otp', validateForgotPasswordRequest, handleForgotPasswordSendOtp);

// Forgot password: verify OTP and set new password
router.post('/forgot-password/verify-otp', validateResetPassword, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp.code !== otp || new Date(user.otp.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    user.otp = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;