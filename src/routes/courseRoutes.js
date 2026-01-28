// src/routes/courseRoutes.js
const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { imageUpload, videoUpload } = require('../utils/cloudinaryUploader');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validation');
const multer = require('multer');

const router = express.Router();

// Configure multer for multiple file uploads (thumbnail + intro video)
const upload = multer();
const multipleUpload = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'intro_video', maxCount: 1 }
]);

// --- ALL SPECIFIC 'GET' ROUTES MUST COME BEFORE DYNAMIC ':id' ROUTE ---

// GET /api/courses - Get all courses
router.get('/', courseController.getAllCourses);

// GET /api/courses/categories - Get all categories
router.get('/categories', courseController.getCategories);

// POST /api/courses/categories - Create new category (admin only)
router.post('/categories', authenticateToken, requireRole('ADMIN'), courseController.createCategory);

// DELETE /api/courses/categories/:id - Delete category (admin only)
router.delete('/categories/:id', authenticateToken, requireRole('ADMIN'), courseController.deleteCategory);

// GET /api/courses/video-series - Get all video series
router.get('/video-series', courseController.getVideoSeries);

// GET /api/courses/series/:seriesName - Get courses by series name
router.get('/series/:seriesName', courseController.getCoursesBySeries);

// --- FIX ---
// GET /api/courses/stats - This route is added to fix the 'invalid uuid' error.
// It must be defined BEFORE the '/:id' route.
router.get('/stats', courseController.getCourseStats);
// --- END FIX ---

// GET /api/courses/:id - Get course by ID (This must be the last 'GET' route)
router.get('/:id', courseController.getCourseById);

// POST /api/courses - Create new course (admin only) with file uploads
router.post('/',
  authenticateToken,
  requireRole('ADMIN'),
  multipleUpload,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('price').optional().isNumeric().withMessage('Price must be a number'),
    body('category_id').optional().isUUID().withMessage('Category ID must be a valid UUID'),
    body('duration_hours').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('Level must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    body('is_published').optional().isBoolean().withMessage('is_published must be a boolean')
  ],
  validate,
  courseController.createCourse
);

// PUT /api/courses/:id - Update course (admin only) with file uploads
router.put('/:id',
  authenticateToken,
  requireRole('ADMIN'),
  multipleUpload,
  [
    param('id').isUUID().withMessage('Course ID must be a valid UUID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString(),
    body('price').optional().isNumeric().withMessage('Price must be a number'),
    body('category_id').optional().isUUID().withMessage('Category ID must be a valid UUID'),
    body('duration_hours').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('Level must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    body('is_published').optional().isBoolean().withMessage('is_published must be a boolean')
  ],
  validate,
  courseController.updateCourse
);

// DELETE /api/courses/:id - Delete course (admin only)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), courseController.deleteCourse);

module.exports = router;