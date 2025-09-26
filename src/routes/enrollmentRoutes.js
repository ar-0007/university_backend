const express = require('express');
const { body, param, query } = require('express-validator');
const enrollmentController = require('../controllers/enrollmentController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');

const router = express.Router();

// GET /api/enrollments - Get all enrollments (admin only)
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN']),
  enrollmentController.getAllEnrollments
);

// POST /api/enrollments - Create new enrollment
router.post('/', 
  authenticateToken,
  [
    body('user_id').isUUID().withMessage('Valid user ID is required'),
    body('course_id').isUUID().withMessage('Valid course ID is required')
  ],
  validate,
  enrollmentController.createEnrollment
);

// GET /api/enrollments/user/:userId/courses - Get approved courses for user
router.get('/user/:userId/courses',
  authenticateToken,
  [
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validate,
  enrollmentController.getApprovedCoursesForUser
);

// GET /api/enrollments/my-courses - Get current user's approved courses
router.get('/my-courses',
  authenticateToken,
  enrollmentController.getMyApprovedCourses
);

// GET /api/enrollments/:id - Get enrollment by ID
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Valid enrollment ID is required')
  ],
  validate,
  enrollmentController.getEnrollmentById
);

// PUT /api/enrollments/:id/status - Update enrollment status (admin only)
router.put('/:id/status',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isUUID().withMessage('Valid enrollment ID is required'),
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Valid status is required'),
    body('rejection_reason').optional().isString().withMessage('Rejection reason must be a string')
  ],
  validate,
  enrollmentController.updateEnrollmentStatus
);

// DELETE /api/enrollments/:id - Delete enrollment (admin only)
router.delete('/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isUUID().withMessage('Valid enrollment ID is required')
  ],
  validate,
  enrollmentController.deleteEnrollment
);

module.exports = router;