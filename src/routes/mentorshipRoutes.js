const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const {
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  getAllSlots,
  deleteRequest
} = require('../controllers/mentorshipController');

/**
 * @swagger
 * /api/mentorship/requests:
 *   get:
 *     summary: Get all mentorship requests
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by request status
 *     responses:
 *       200:
 *         description: Mentorship requests retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/requests', authenticateToken, requireRole(['ADMIN']), getAllRequests);

/**
 * @swagger
 * /api/mentorship/requests/{id}:
 *   get:
 *     summary: Get mentorship request by ID
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Mentorship request retrieved successfully
 *       404:
 *         description: Request not found
 */
router.get('/requests/:id', authenticateToken, requireRole(['ADMIN']), getRequestById);

/**
 * @swagger
 * /api/mentorship/requests/{id}/approve:
 *   put:
 *     summary: Approve mentorship request with Google Meet link
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - zoom_link
 *             properties:
 *               scheduled_date:
 *                 type: string
 *                 format: date
 *               scheduled_time:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *               zoom_link:
 *                 type: string
 *                 description: Google Meet link for the session
 *     responses:
 *       200:
 *         description: Request approved successfully
 *       400:
 *         description: Validation error
 */
router.put('/requests/:id/approve', authenticateToken, requireRole(['ADMIN']), approveRequest);

/**
 * @swagger
 * /api/mentorship/requests/{id}/reject:
 *   put:
 *     summary: Reject mentorship request
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Request rejected successfully
 */
router.put('/requests/:id/reject', authenticateToken, requireRole(['ADMIN']), rejectRequest);

/**
 * @swagger
 * /api/mentorship/requests/{id}:
 *   delete:
 *     summary: Delete mentorship request
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Request deleted successfully
 */
router.delete('/requests/:id', authenticateToken, requireRole(['ADMIN']), deleteRequest);

/**
 * @swagger
 * /api/mentorship/slots:
 *   get:
 *     summary: Get all mentorship slots
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mentorship slots retrieved successfully
 */
router.get('/slots', authenticateToken, requireRole(['ADMIN']), getAllSlots);

/**
 * @swagger
 * /api/mentorship/my-bookings:
 *   get:
 *     summary: Get current user's mentorship bookings
 *     tags: [Mentorship]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const { getSupabaseClient } = require('../utils/supabaseClient');
    const mentorshipService = require('../services/mentorshipService');
    
    const supabase = getSupabaseClient();
    const userId = req.user.user_id;
    
    // Get user's bookings
    const bookings = await mentorshipService.getAllMentorshipBookings(supabase, userId);
    
    // Transform the data to match frontend expectations
    const transformedBookings = bookings.map(booking => ({
      booking_id: booking.booking_id,
      slot_id: booking.slot_id,
      user_id: booking.user_id,
      payment_status: booking.payment_status || 'PENDING',
      scheduled_date: booking.slot?.start_time ? new Date(booking.slot.start_time).toISOString().split('T')[0] : '',
      scheduled_time: booking.slot?.start_time ? new Date(booking.slot.start_time).toTimeString().slice(0, 5) : '',
      instructor_id: booking.slot?.mentor?.instructor_id || '',
      customer_name: booking.user?.first_name && booking.user?.last_name 
        ? `${booking.user.first_name} ${booking.user.last_name}` 
        : booking.user?.email || 'Unknown',
      customer_email: booking.user?.email || '',
      customer_phone: booking.user?.phone || '',
      meeting_link: booking.meeting_link || null
    }));
    
    res.json({
      success: true,
      data: transformedBookings,
      message: 'User bookings retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user bookings'
      }
    });
  }
});

module.exports = router;