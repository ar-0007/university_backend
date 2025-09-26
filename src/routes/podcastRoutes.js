// src/routes/podcastRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const podcastController = require('../controllers/podcastController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');
const multer = require('multer');

const router = express.Router();

// Configure multer for podcast uploads (video and thumbnail)
const upload = multer({
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for video files
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowedVideoMimes = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm'
      ];
      
      if (allowedVideoMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video file type. Only MP4, MOV, AVI, MKV, and WebM are allowed.'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      const allowedImageMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      if (allowedImageMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid thumbnail file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
      }
    } else {
      cb(new Error('Unexpected field name.'), false);
    }
  }
});

// Configure multer for multiple file uploads
const multipleUpload = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

/**
 * @swagger
 * components:
 *   schemas:
 *     Podcast:
 *       type: object
 *       properties:
 *         podcast_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         video_url:
 *           type: string
 *         thumbnail_url:
 *           type: string
 *         duration:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *         published_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/podcasts:
 *   get:
 *     summary: Get all podcasts
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Podcasts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Podcast'
 */
// Public route for published podcasts
router.get('/public', 
  [query('status').optional().isIn(['published']).withMessage('Status must be published')], 
  validate, 
  podcastController.getPublishedPodcasts
);

// Admin route for all podcasts
router.get('/', 
  authenticateToken, 
  requireRole('ADMIN'),
  [query('status').optional().isIn(['draft', 'scheduled', 'published', 'archived']).withMessage('Status must be draft, scheduled, published, or archived')], 
  validate, 
  podcastController.getAllPodcasts
);

/**
 * @swagger
 * /api/podcasts/upload:
 *   post:
 *     summary: Create new podcast with file uploads
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Podcast title
 *               description:
 *                 type: string
 *                 description: Podcast description
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Podcast video file (required)
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Podcast thumbnail image (optional)
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled, published]
 *                 default: draft
 *                 description: Podcast status
 *     responses:
 *       201:
 *         description: Podcast created successfully
 *       400:
 *         description: Validation error or file upload error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post('/upload', 
  authenticateToken, 
  requireRole('ADMIN'),
  multipleUpload,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('status').optional().isIn(['draft', 'scheduled', 'published']).withMessage('Status must be draft, scheduled, or published')
  ],
  validate,
  podcastController.createPodcastWithUpload
);

/**
 * @swagger
 * /api/podcasts:
 *   post:
 *     summary: Create new podcast without file upload
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video_url:
 *                 type: string
 *                 description: URL of pre-uploaded video
 *               thumbnail_url:
 *                 type: string
 *                 description: URL of pre-uploaded thumbnail
 *               duration:
 *                 type: integer
 *                 description: Video duration in seconds
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *     responses:
 *       201:
 *         description: Podcast created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post('/', 
  authenticateToken, 
  requireRole('ADMIN'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('video_url').notEmpty().isURL().withMessage('Video URL is required and must be valid'),
    body('thumbnail_url').optional().isURL().withMessage('Thumbnail URL must be valid'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('status').optional().isIn(['draft', 'scheduled', 'published']).withMessage('Status must be draft, scheduled, or published')
  ],
  validate,
  podcastController.createPodcast
);



/**
 * @swagger
 * /api/podcasts/liked:
 *   get:
 *     summary: Get liked podcasts for authenticated user
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liked podcasts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 */
router.get('/liked', 
  authenticateToken,
  podcastController.getLikedPodcasts
);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   get:
 *     summary: Get podcast by ID
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast retrieved successfully
 *       404:
 *         description: Podcast not found
 */
router.get('/:id', 
  authenticateToken, 
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.getPodcastById
);

/**
 * @swagger
 * /api/podcasts/{id}/upload:
 *   put:
 *     summary: Update podcast with file uploads
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: Podcast updated successfully
 *       404:
 *         description: Podcast not found
 */
router.put('/:id/upload', 
  authenticateToken, 
  requireRole('ADMIN'),
  multipleUpload,
  [
    param('id').isUUID().withMessage('Podcast ID must be a valid UUID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('status').optional().isIn(['draft', 'scheduled', 'published', 'archived']).withMessage('Status must be draft, scheduled, published, or archived')
  ],
  validate,
  podcastController.updatePodcastWithUpload
);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   put:
 *     summary: Update podcast without file upload
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               video_url:
 *                 type: string
 *               thumbnail_url:
 *                 type: string
 *               duration:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: Podcast updated successfully
 *       404:
 *         description: Podcast not found
 */
router.put('/:id', 
  authenticateToken, 
  requireRole('ADMIN'),
  [
    param('id').isUUID().withMessage('Podcast ID must be a valid UUID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('video_url').optional().isURL().withMessage('Video URL must be valid'),
    body('thumbnail_url').optional().isURL().withMessage('Thumbnail URL must be valid'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('status').optional().isIn(['draft', 'scheduled', 'published', 'archived']).withMessage('Status must be draft, scheduled, published, or archived')
  ],
  validate,
  podcastController.updatePodcast
);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   delete:
 *     summary: Delete podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast deleted successfully
 *       404:
 *         description: Podcast not found
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole('ADMIN'),
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.deletePodcast
);

/**
 * @swagger
 * /api/podcasts/{id}/publish:
 *   patch:
 *     summary: Publish a podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast published successfully
 *       404:
 *         description: Podcast not found
 */
router.patch('/:id/publish', 
  authenticateToken, 
  requireRole('ADMIN'),
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.publishPodcast
);

/**
 * @swagger
 * /api/podcasts/{id}/archive:
 *   patch:
 *     summary: Archive a podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast archived successfully
 *       404:
 *         description: Podcast not found
 */
router.patch('/:id/archive', 
  authenticateToken, 
  requireRole('ADMIN'),
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.archivePodcast
);

/**
 * @swagger
 * /api/podcasts/{id}/like:
 *   post:
 *     summary: Like a podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast liked successfully
 *       404:
 *         description: Podcast not found
 */
router.post('/:id/like', 
  authenticateToken,
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.likePodcast
);

/**
 * @swagger
 * /api/podcasts/{id}/like:
 *   delete:
 *     summary: Unlike a podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Podcast unliked successfully
 *       404:
 *         description: Podcast not found
 */
router.delete('/:id/like', 
  authenticateToken,
  [param('id').isUUID().withMessage('Podcast ID must be a valid UUID')], 
  validate, 
  podcastController.unlikePodcast
);

module.exports = router;

