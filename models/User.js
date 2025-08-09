const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *         fullName:
 *           type: string
 *           description: User's full name
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           description: User's password (hashed)
 *           example: "hashedPassword123"
 *         customerId:
 *           type: string
 *           description: Unique customer ID
 *           example: "john_3210"
 *         isVerified:
 *           type: boolean
 *           description: Whether user is verified
 *           default: false
 *         otp:
 *           type: object
 *           description: OTP information for verification
 *           properties:
 *             code:
 *               type: string
 *               description: 6-digit OTP code
 *               example: "123456"
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               description: OTP expiration time
 *         resetPasswordToken:
 *           type: string
 *           description: Password reset token
 *         resetPasswordExpires:
 *           type: string
 *           format: date-time
 *           description: Password reset token expiration
 *         subscription:
 *           type: object
 *           description: User's subscription details
 *           properties:
 *             planId:
 *               type: string
 *               description: Subscription plan ID
 *             planName:
 *               type: string
 *               description: Subscription plan name
 *             status:
 *               type: string
 *               enum: [active, inactive, pending]
 *               description: Subscription status
 *               default: inactive
 *             startDate:
 *               type: string
 *               format: date-time
 *               description: Subscription start date
 *             endDate:
 *               type: string
 *               format: date-time
 *               description: Subscription end date
 *             paymentId:
 *               type: string
 *               description: Payment ID
 *             amount:
 *               type: number
 *               description: Subscription amount
 *         additionalMembers:
 *           type: array
 *           description: Additional members added to subscription
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Member name
 *               mobile:
 *                 type: string
 *                 description: Member mobile number
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Member email
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         isActive:
 *           type: boolean
 *           description: Whether user account is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false
  },
  customerId: {
    type: String,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  subscription: {
    planId: String,
    planName: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    paymentId: String,
    amount: Number
  },
  additionalMembers: [{
    name: String,
    email: String
  }],
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate customer ID before saving
userSchema.pre('save', async function(next) {
  if (!this.customerId) {
    const emailPrefix = this.email?.split('@')[0] || 'user';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    this.customerId = `${emailPrefix}_${randomSuffix}`;
  }

  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 