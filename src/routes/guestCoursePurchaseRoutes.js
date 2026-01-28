const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createGuestCoursePurchase,
  createPaymentIntent,
  getGuestCoursePurchaseById,
  updatePaymentStatus,
  getAllGuestCoursePurchases,
  getGuestCoursePurchaseByAccessCode,
  getPurchasedCoursesByEmail,
  getMyPurchasedCourses,
  deleteGuestCoursePurchase,
  getPurchaseStats,
  sendCredentials
} = require('../controllers/guestCoursePurchaseController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');

// Validation middleware
const validateGuestCoursePurchase = [
  body('courseId').isUUID().withMessage('Course ID must be a valid UUID'),
  body('customerName').trim().isLength({ min: 2, max: 255 }).withMessage('Customer name must be between 2 and 255 characters'),
  body('customerEmail').isEmail().normalizeEmail().withMessage('Customer email must be a valid email address'),
  body('customerPhone').optional().isMobilePhone().withMessage('Customer phone must be a valid phone number')
];

const validatePaymentStatus = [
  body('paymentStatus').isIn(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']).withMessage('Invalid payment status'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
  body('transactionId').optional().isString().withMessage('Transaction ID must be a string')
];

const validatePaymentIntent = [
  body('purchaseId').isUUID().withMessage('Purchase ID must be a valid UUID')
];

// Admin routes (authentication required) - Must come before parameter routes
router.get('/', authenticateToken, requireRole('ADMIN'), getAllGuestCoursePurchases);
router.get('/stats/overview', authenticateToken, requireRole('ADMIN'), getPurchaseStats);

// Authenticated user routes (must come before parameter routes)
router.get('/my-courses', authenticateToken, getMyPurchasedCourses);

// Public routes (no authentication required)
router.post('/', validateGuestCoursePurchase, createGuestCoursePurchase);
router.post('/create-payment-intent', validatePaymentIntent, createPaymentIntent);
router.get('/access/:accessCode', getGuestCoursePurchaseByAccessCode);
router.get('/:purchaseId', getGuestCoursePurchaseById);
router.put('/:purchaseId/payment', validatePaymentStatus, updatePaymentStatus);

// DEPRECATED: Security vulnerability - allows access to any user's courses
// router.get('/email/:email', getPurchasedCoursesByEmail);

// Admin routes (authentication required)
router.delete('/:purchaseId', authenticateToken, requireRole('ADMIN'), deleteGuestCoursePurchase);
router.post('/:purchaseId/send-credentials', authenticateToken, requireRole('ADMIN'), sendCredentials);

module.exports = router;