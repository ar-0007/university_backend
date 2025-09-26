// src/routes/videoProgressRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const videoProgressController = require('../controllers/videoProgressController');
const { authenticateToken } = require('../middleware/restAuthMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const updateVideoProgressValidation = [
  body('courseId')
    .isUUID()
    .withMessage('Valid course ID is required'),
  body('videoUrl')
    .isURL()
    .withMessage('Valid video URL is required'),
  body('currentTime')
    .isFloat({ min: 0 })
    .withMessage('Current time must be a positive number'),
  body('totalDuration')
    .isFloat({ min: 0 })
    .withMessage('Total duration must be a positive number'),
  body('chapterId')
    .optional()
    .isUUID()
    .withMessage('Chapter ID must be a valid UUID if provided')
];

const courseIdValidation = [
  param('courseId')
    .isUUID()
    .withMessage('Valid course ID is required')
];

const videoUrlValidation = [
  param('videoUrl')
    .notEmpty()
    .withMessage('Video URL is required')
];

const limitValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

// Routes

/**
 * @route POST /api/video-progress
 * @desc Update video progress for a user
 * @access Private
 */
router.post('/', updateVideoProgressValidation, videoProgressController.updateVideoProgress);

/**
 * @route GET /api/video-progress/:courseId/:videoUrl
 * @desc Get video progress for a specific video
 * @access Private
 */
router.get('/:courseId/:videoUrl', 
  [...courseIdValidation, ...videoUrlValidation], 
  videoProgressController.getVideoProgress
);

/**
 * @route GET /api/video-progress/course/:courseId
 * @desc Get all video progress for a course
 * @access Private
 */
router.get('/course/:courseId', courseIdValidation, videoProgressController.getCourseVideoProgress);

/**
 * @route GET /api/video-progress/my-progress
 * @desc Get all video progress for the authenticated user
 * @access Private
 */
router.get('/my-progress', videoProgressController.getUserVideoProgress);

/**
 * @route GET /api/video-progress/stats
 * @desc Get video progress statistics for the authenticated user
 * @access Private
 */
router.get('/stats', videoProgressController.getVideoProgressStats);

/**
 * @route GET /api/video-progress/continue-watching
 * @desc Get recently watched videos for "Continue Watching" feature
 * @access Private
 */
router.get('/continue-watching', limitValidation, videoProgressController.getRecentlyWatchedVideos);

module.exports = router;