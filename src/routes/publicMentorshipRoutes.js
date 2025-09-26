const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const {
  getAvailableSlots,
  createBooking,
  getBookingById,
  updatePaymentStatus,
  getUpcomingMentorshipSessions
} = require('../controllers/publicMentorshipController');

/**
 * @swagger
 * /api/public/mentorship/slots/{instructorId}:
 *   get:
 *     summary: Get available mentorship slots for an instructor
 *     tags: [Public Mentorship]
 *     parameters:
 *       - in: path
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Instructor ID
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/slots/:instructorId', getAvailableSlots);

/**
 * @swagger
 * /api/public/mentorship/bookings:
 *   post:
 *     summary: Create a mentorship booking (no authentication required)
 *     tags: [Public Mentorship]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instructorId
 *               - customerName
 *               - customerEmail
 *               - customerPhone
 *               - preferredDate
 *               - preferredTime
 *             properties:
 *               instructorId:
 *                 type: string
 *                 description: Instructor ID
 *               customerName:
 *                 type: string
 *                 description: Customer's full name
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 description: Customer's email address
 *               customerPhone:
 *                 type: string
 *                 description: Customer's phone number
 *               preferredDate:
 *                 type: string
 *                 format: date
 *                 description: Preferred date for the session
 *               preferredTime:
 *                 type: string
 *                 description: Preferred time for the session
 *               message:
 *                 type: string
 *                 description: Additional message or requirements
 *               preferredTopics:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Preferred topics for the session
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/bookings', [
  body('instructorId').notEmpty().withMessage('Instructor ID is required'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerPhone').optional(),
  body('preferredDate').notEmpty().withMessage('Preferred date is required'),
  body('preferredTime').notEmpty().withMessage('Preferred time is required'),
  validate
], createBooking);

/**
 * @swagger
 * /api/public/mentorship/bookings/{bookingId}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Public Mentorship]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/bookings/:bookingId', getBookingById);

/**
 * @swagger
 * /api/public/mentorship/bookings/{bookingId}/payment:
 *   put:
 *     summary: Update booking payment status
 *     tags: [Public Mentorship]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [PENDING, PAID, FAILED]
 *                 description: Payment status
 *               transactionId:
 *                 type: string
 *                 description: Payment transaction ID
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/bookings/:bookingId/payment', [
  body('paymentStatus').isIn(['PENDING', 'PAID', 'FAILED']).withMessage('Invalid payment status'),
  validate
], updatePaymentStatus);

/**
 * @swagger
 * /api/public/mentorship/upcoming-sessions:
 *   get:
 *     summary: Get upcoming mentorship sessions (public endpoint)
 *     tags: [Public Mentorship]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of sessions to return
 *     responses:
 *       200:
 *         description: Upcoming mentorship sessions retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/upcoming-sessions', getUpcomingMentorshipSessions);

module.exports = router;