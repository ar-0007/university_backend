const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const {
  createGuestBooking,
  getGuestBookingById,
  updatePaymentStatus,
  getAllGuestBookings,
  updateBookingStatus,
  deleteGuestBooking
} = require('../controllers/guestBookingController');

/**
 * @swagger
 * /api/guest-bookings:
 *   post:
 *     summary: Create a guest booking (redirects to checkout)
 *     tags: [Guest Bookings]
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
 *         description: Guest booking created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', [
  body('instructorId').notEmpty().withMessage('Instructor ID is required'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerPhone').notEmpty().withMessage('Customer phone is required'),
  body('preferredDate').notEmpty().withMessage('Preferred date is required'),
  body('preferredTime').notEmpty().withMessage('Preferred time is required'),
  validate
], createGuestBooking);

/**
 * @swagger
 * /api/guest-bookings/{bookingId}:
 *   get:
 *     summary: Get guest booking details by ID
 *     tags: [Guest Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest booking ID
 *     responses:
 *       200:
 *         description: Guest booking details retrieved successfully
 *       404:
 *         description: Guest booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/:bookingId', getGuestBookingById);

/**
 * @swagger
 * /api/guest-bookings/{bookingId}/payment:
 *   put:
 *     summary: Update guest booking payment status
 *     tags: [Guest Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest booking ID
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
 *                 enum: [PENDING, PAID, FAILED, CANCELLED]
 *                 description: Payment status
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used
 *               transactionId:
 *                 type: string
 *                 description: Payment transaction ID
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/:bookingId/payment', [
  body('paymentStatus').isIn(['PENDING', 'PAID', 'FAILED', 'CANCELLED']).withMessage('Invalid payment status'),
  validate
], updatePaymentStatus);

// Admin routes (protected)
/**
 * @swagger
 * /api/guest-bookings:
 *   get:
 *     summary: Get all guest bookings (admin only)
 *     tags: [Guest Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: instructorId
 *         schema:
 *           type: string
 *         description: Filter by instructor ID
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: bookingStatus
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: Guest bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireRole('ADMIN'), getAllGuestBookings);

/**
 * @swagger
 * /api/guest-bookings/{bookingId}/status:
 *   put:
 *     summary: Update guest booking status (admin only)
 *     tags: [Guest Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingStatus
 *             properties:
 *               bookingStatus:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED]
 *                 description: Booking status
 *               meetingLink:
 *                 type: string
 *                 description: Meeting link
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:bookingId/status', [
  body('bookingStatus').isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid booking status'),
  validate
], authenticateToken, requireRole('ADMIN'), updateBookingStatus);

/**
 * @swagger
 * /api/guest-bookings/{bookingId}:
 *   delete:
 *     summary: Delete guest booking (admin only)
 *     tags: [Guest Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest booking ID
 *     responses:
 *       200:
 *         description: Guest booking deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/:bookingId', authenticateToken, requireRole('ADMIN'), deleteGuestBooking);

module.exports = router; 