const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const razorpay = require('../config/razorpay');
const { auth } = require('../middleware/auth');
const { validateSubscription } = require('../middleware/validation');
const { writeSheet } = require('../googleSheetService');

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Plan's unique identifier
 *         planId:
 *           type: string
 *           description: Plan ID
 *         planName:
 *           type: string
 *           description: Name of the subscription plan
 *         description:
 *           type: string
 *           description: Plan description
 *         price:
 *           type: number
 *           description: Plan price in INR
 *         specialPrice:
 *           type: number
 *           description: Special discounted price
 *         duration:
 *           type: number
 *           description: Duration in months
 *         maxMembers:
 *           type: number
 *           description: Maximum number of members allowed
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: List of plan features
 *         isSpecialOffer:
 *           type: boolean
 *           description: Whether this is a special offer
 *         isActive:
 *           type: boolean
 *           description: Whether the plan is active
 *     UserSubscription:
 *       type: object
 *       properties:
 *         planId:
 *           type: string
 *           description: Plan ID
 *         planName:
 *           type: string
 *           description: Plan name
 *         status:
 *           type: string
 *           enum: [active, inactive, expired]
 *           description: Subscription status
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Subscription start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Subscription end date
 *         paymentId:
 *           type: string
 *           description: Payment ID
 *         amount:
 *           type: number
 *           description: Amount paid
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Payment's unique identifier
 *         userId:
 *           type: string
 *           description: User ID
 *         subscriptionId:
 *           type: string
 *           description: Subscription plan ID
 *         razorpayOrderId:
 *           type: string
 *           description: Razorpay order ID
 *         razorpayPaymentId:
 *           type: string
 *           description: Razorpay payment ID
 *         amount:
 *           type: number
 *           description: Payment amount
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *           description: Payment status
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - planId
 *       properties:
 *         planId:
 *           type: string
 *           description: Subscription plan ID
 *           example: "507f1f77bcf86cd799439011"
 *         additionalMembers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               mobileNumber:
 *                 type: string
 *                 example: "9876543211"
 *           description: Additional members to add to subscription
 *     CreateOrderResponse:
 *       type: object
 *       properties:
 *         orderId:
 *           type: string
 *           description: Razorpay order ID
 *         amount:
 *           type: number
 *           description: Order amount
 *         currency:
 *           type: string
 *           example: "INR"
 *         isFreeUser:
 *           type: boolean
 *           description: Whether user gets free subscription
 *         plan:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             duration:
 *               type: number
 *             maxMembers:
 *               type: number
 *     VerifyPaymentRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentId
 *         - signature
 *       properties:
 *         orderId:
 *           type: string
 *           description: Razorpay order ID
 *           example: "order_1234567890"
 *         paymentId:
 *           type: string
 *           description: Razorpay payment ID
 *           example: "pay_1234567890"
 *         signature:
 *           type: string
 *           description: Payment signature for verification
 *           example: "abc123def456"
 *         additionalMembers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         media:
 *           type: array
 *           items:
 *             type: object
 *         totalPages:
 *           type: number
 *           description: Total number of pages
 *         currentPage:
 *           type: number
 *           description: Current page number
 *         total:
 *           type: number
 *           description: Total number of items
 */

/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     summary: Get all subscription plans
 *     description: Retrieves all active subscription plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionPlan'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Subscription.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/my-subscription:
 *   get:
 *     summary: Get user's current subscription
 *     description: Retrieves the current user's subscription details
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   $ref: '#/components/schemas/UserSubscription'
 *                 additionalMembers:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
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
// Get user's current subscription
router.get('/my-subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('subscription.planId');
    res.json({
      subscription: user.subscription,
      additionalMembers: user.additionalMembers
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/create-order:
 *   post:
 *     summary: Create subscription order
 *     description: Creates a new subscription order with Razorpay
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateOrderResponse'
 *       400:
 *         description: Invalid request or user already has active subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Plan not found
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
// Create subscription order
router.post('/create-order', auth, validateSubscription, async (req, res) => {
  try {
    const { planId, additionalMembers = [] } = req.body;

    // Get plan details
    const plan = await Subscription.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if user already has an active subscription
    const user = await User.findById(req.user._id);
    if (user.subscription.status === 'active') {
      return res.status(400).json({ message: 'You already have an active subscription' });
    }

    // Calculate amount (first 500 users get free subscription)
    const totalUsers = await User.countDocuments();
    const isFreeUser = totalUsers <= 500;
    const amount = isFreeUser ? 0 : (plan.specialPrice || plan.price);

    // Create Razorpay order
    const orderOptions = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        customerId: user.customerId
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    // Create payment record
    const payment = new Payment({
      userId: user._id,
      subscriptionId: plan._id,
      razorpayOrderId: order.id,
      amount: amount,
      status: 'pending'
    });

    await payment.save();

    res.json({
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      isFreeUser,
      plan: {
        id: plan._id,
        name: plan.planName,
        description: plan.description,
        duration: plan.duration,
        maxMembers: plan.maxMembers
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/verify-payment:
 *   post:
 *     summary: Verify payment and activate subscription
 *     description: Verifies the payment signature and activates the subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyPaymentRequest'
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subscription activated successfully"
 *                 subscription:
 *                   $ref: '#/components/schemas/UserSubscription'
 *                 additionalMembers:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid payment signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Payment not found
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
// Verify payment and activate subscription
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { orderId, paymentId, signature, additionalMembers = [] } = req.body;

    // Verify payment signature
    const text = `${orderId}|${paymentId}`;
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get payment details
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    payment.razorpayPaymentId = paymentId;
    payment.status = 'completed';
    await payment.save();

    // Get plan details
    const plan = await Subscription.findById(payment.subscriptionId);
    
    // Update user subscription
    const user = await User.findById(req.user._id);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration);

    user.subscription = {
      planId: plan._id,
      planName: plan.planName,
      status: 'active',
      startDate,
      endDate,
      paymentId: payment._id,
      amount: payment.amount
    };

    // Add additional members if provided
    if (additionalMembers.length > 0) {
      user.additionalMembers = additionalMembers;
    }

    await user.save();

    // Write to Google Sheets
    try {
      await writeSheet(process.env.SPREADSHEET_ID, [[
        user.fullName,
        user.email,
        user.mobileNumber,
        'Subscription Activated',
        user.customerId,
        plan.planName,
        payment.amount,
        new Date().toISOString()
      ]]);
    } catch (sheetError) {
      console.error('Google Sheets error:', sheetError);
    }

    res.json({
      message: 'Subscription activated successfully',
      subscription: user.subscription,
      additionalMembers: user.additionalMembers
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     description: Cancels the user's active subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subscription cancelled successfully"
 *       400:
 *         description: No active subscription found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
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
// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.subscription.status !== 'active') {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    user.subscription.status = 'inactive';
    await user.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/payments:
 *   get:
 *     summary: Get payment history
 *     description: Retrieves the user's payment history
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
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
// Get payment history
router.get('/payments', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('subscriptionId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 