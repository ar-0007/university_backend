const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const chapterService = require('../services/chapterService');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/chapters:
 *   get:
 *     summary: Get all chapters
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter chapters by course ID
 *     responses:
 *       200:
 *         description: List of chapters retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       chapter_id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       course_id:
 *                         type: string
 *                       order_index:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/',
  authenticateToken,
  query('course_id').optional().isUUID().withMessage('Course ID must be a valid UUID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { course_id } = req.query;
      let chapters;

      if (course_id) {
        chapters = await chapterService.getChaptersByCourse(req.supabase, course_id);
      } else {
        // Get all chapters (admin only)
        chapters = await chapterService.getAllChapters(req.supabase);
      }

      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error fetching chapters:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch chapters'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/chapters/course/{courseId}:
 *   get:
 *     summary: Get all chapters for a specific course
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 *       500:
 *         description: Server error
 */
router.get('/course/:courseId',
  authenticateToken,
  param('courseId').isUUID().withMessage('Invalid course ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid course ID',
            details: errors.array()
          }
        });
      }

      const { courseId } = req.params;
      const chapters = await chapterService.getChaptersByCourse(req.supabase, courseId);

      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error fetching chapters by course:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch chapters for course'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   get:
 *     summary: Get a specific chapter by ID
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Server error
 */
router.get('/:chapterId',
  authenticateToken,
  param('chapterId').isUUID().withMessage('Invalid chapter ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid chapter ID',
            details: errors.array()
          }
        });
      }

      const { chapterId } = req.params;
      const chapter = await chapterService.getChapterById(req.supabase, chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Chapter not found'
          }
        });
      }

      res.json({
        success: true,
        data: chapter
      });
    } catch (error) {
      console.error('Error fetching chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch chapter'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/chapters:
 *   post:
 *     summary: Create a new chapter (Admin only)
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - course_id
 *             properties:
 *               title:
 *                 type: string
 *               course_id:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *               order_index:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Chapter created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.post('/',
  authenticateToken,
  requireRole(['admin']),
  body('title').notEmpty().withMessage('Chapter title is required'),
  body('course_id').isUUID().withMessage('Valid course ID is required'),
  body('description').optional().isString(),
  body('order_index').optional().isInt({ min: 0 }).withMessage('Order index must be a non-negative integer'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { title, course_id, description, order_index } = req.body;
      
      const chapterData = {
        title,
        courseId: course_id,
        description,
        orderIndex: order_index
      };

      const newChapter = await chapterService.createChapter(req.supabase, chapterData);
      
      res.status(201).json({
        success: true,
        data: newChapter,
        message: 'Chapter created successfully'
      });
    } catch (error) {
      console.error('Error creating chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create chapter'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   put:
 *     summary: Update a chapter (Admin only)
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chapter ID
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
 *               order_index:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Chapter updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Server error
 */
router.put('/:chapterId',
  authenticateToken,
  requireRole(['admin']),
  param('chapterId').isUUID().withMessage('Invalid chapter ID'),
  body('title').optional().notEmpty().withMessage('Chapter title cannot be empty'),
  body('description').optional().isString(),
  body('order_index').optional().isInt({ min: 0 }).withMessage('Order index must be a non-negative integer'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { chapterId } = req.params;
      const updateData = req.body;

      const updatedChapter = await chapterService.updateChapter(req.supabase, chapterId, updateData);
      
      if (!updatedChapter) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Chapter not found'
          }
        });
      }

      res.json({
        success: true,
        data: updatedChapter,
        message: 'Chapter updated successfully'
      });
    } catch (error) {
      console.error('Error updating chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update chapter'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   delete:
 *     summary: Delete a chapter (Admin only)
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Chapter not found
 *       500:
 *         description: Server error
 */
router.delete('/:chapterId',
  authenticateToken,
  requireRole(['admin']),
  param('chapterId').isUUID().withMessage('Invalid chapter ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid chapter ID',
            details: errors.array()
          }
        });
      }

      const { chapterId } = req.params;
      const success = await chapterService.deleteChapter(req.supabase, chapterId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Chapter not found'
          }
        });
      }

      res.json({
        success: true,
        message: 'Chapter deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete chapter'
        }
      });
    }
  }
);

module.exports = router;