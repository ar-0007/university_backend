const express = require('express');
const router = express.Router();
const {
  createCoursePaymentIntent,
  createMentorshipPaymentIntent,
  createGuestBookingPaymentIntent,
  createGuestCoursePaymentIntent,
  confirmGuestBookingPayment,
  confirmPayment,
  getPaymentHistory,
  getPaymentStats,
  handleStripeWebhook
} = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validatePaymentIntent = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'usd', 'eur', 'gbp', 'inr'])
    .withMessage('Currency must be USD, EUR, GBP, or INR (case insensitive)'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

const validateCoursePayment = [
  body('courseId')
    .isUUID()
    .withMessage('Course ID must be a valid UUID'),
  ...validatePaymentIntent
];

const validateMentorshipPayment = [
  body('slotId')
    .isUUID()
    .withMessage('Slot ID must be a valid UUID'),
  ...validatePaymentIntent
];

const validateGuestBookingPayment = [
  body('bookingId')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  ...validatePaymentIntent
];

const validateGuestCoursePayment = [
  body('purchaseId')
    .isUUID()
    .withMessage('Purchase ID must be a valid UUID'),
  ...validatePaymentIntent
];

const validateGuestBookingConfirmation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment Intent ID is required'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment Method ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

const validatePaymentConfirmation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment Intent ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         client_secret:
 *           type: string
 *           description: Stripe client secret for frontend
 *         payment_intent_id:
 *           type: string
 *           description: Stripe payment intent ID
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           description: Payment currency
 *         payment_id:
 *           type: string
 *           description: Internal payment record ID
 *     
 *     Payment:
 *       type: object
 *       properties:
 *         payment_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         course_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         mentorship_slot_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [stripe, paypal, razorpay]
 *         payment_intent_id:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         created_at:
 *           type: string
 *           format: date-time
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 */

/**
 * @swagger
 * /api/payments/course/intent:
 *   post:
 *     summary: Create payment intent for course purchase
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - amount
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the course to purchase
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR]
 *                 default: USD
 *                 description: Payment currency
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntent'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Course not found
 *       409:
 *         description: User already enrolled in course
 */
router.post('/course/intent', authenticateToken, validateCoursePayment, createCoursePaymentIntent);

/**
 * @swagger
 * /api/payments/mentorship/intent:
 *   post:
 *     summary: Create payment intent for mentorship booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotId
 *               - amount
 *             properties:
 *               slotId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the mentorship slot to book
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR]
 *                 default: USD
 *                 description: Payment currency
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntent'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Mentorship slot not found or not available
 */
router.post('/mentorship/intent', authenticateToken, validateMentorshipPayment, createMentorshipPaymentIntent);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment and complete enrollment/booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *     responses:
 *       200:
 *         description: Payment confirmed and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *                     paymentIntent:
 *                       type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Payment not completed or validation error
 *       404:
 *         description: Payment record not found
 */
router.post('/confirm', authenticateToken, validatePaymentConfirmation, confirmPayment);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history for current user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                 message:
 *                   type: string
 */
router.get('/history', authenticateToken, getPaymentHistory);

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment statistics (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     monthlyRevenue:
 *                       type: object
 *                     paymentMethods:
 *                       type: object
 *                     recentTransactions:
 *                       type: array
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 */
router.get('/stats', authenticateToken, requireRole('ADMIN'), getPaymentStats);

/**
 * @swagger
 * /api/payments/webhook/stripe:
 *   post:
 *     summary: Stripe webhook handler
 *     tags: [Payments]
 *     description: Webhook endpoint for Stripe payment events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

/**
 * @swagger
 * /api/payments/guest-booking-intent:
 *   post:
 *     summary: Create payment intent for guest booking
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - amount
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 description: Guest booking ID
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 default: usd
 *                 description: Payment currency
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.post('/guest-booking-intent', validateGuestBookingPayment, createGuestBookingPaymentIntent);
router.post('/guest-course-payment-intent', validateGuestCoursePayment, createGuestCoursePaymentIntent);

/**
 * @swagger
 * /api/payments/confirm-guest-booking:
 *   post:
 *     summary: Confirm payment for guest booking
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *               - paymentMethodId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Payment failed
 *       500:
 *         description: Internal server error
 */
router.post('/confirm-guest-booking', validateGuestBookingConfirmation, confirmGuestBookingPayment);

module.exports = router;

