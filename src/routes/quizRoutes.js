const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');
const quizService = require('../services/quizService');

const router = express.Router();

// Admin routes for quiz management
/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get all quizzes (Admin only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      const quizzes = await quizService.getAllQuizzes(req.supabase);

      res.status(200).json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Error fetching all quizzes:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch quizzes'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz (Admin only)
 *     tags: [Quizzes]
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
 *               - chapter_id
 *               - questions_data
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               chapter_id:
 *                 type: string
 *                 format: uuid
 *               questions_data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('title').notEmpty().withMessage('Quiz title is required'),
    body('chapter_id').isUUID().withMessage('Valid chapter ID is required'),
    body('questions_data').isObject().withMessage('Questions data must be an object')
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, chapter_id, questions_data } = req.body;
      
      const quiz = await quizService.createQuiz(req.supabase, {
        title,
        description,
        chapterId: chapter_id,
        questionsData: questions_data
      });

      res.status(201).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create quiz'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/course/{courseId}:
 *   get:
 *     summary: Get all quizzes for a specific course
 *     tags: [Quizzes]
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
 *         description: Quizzes retrieved successfully
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
 *                     $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: Course not found
 */
router.get('/course/:courseId',
  authenticateToken,
  param('courseId').isUUID().withMessage('Invalid course ID'),
  validate,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const quizzes = await quizService.getQuizzesByCourse(req.supabase, courseId);
      
      res.status(200).json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Error fetching quizzes by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quizzes'
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/chapter/{chapterId}:
 *   get:
 *     summary: Get all quizzes for a specific chapter
 *     tags: [Quizzes]
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
 *         description: Quizzes retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chapter not found
 */
router.get('/chapter/:chapterId', 
  authenticateToken,
  param('chapterId').isUUID().withMessage('Invalid chapter ID'),
  validate,
  async (req, res) => {
    try {
      const { chapterId } = req.params;
      const quizzes = await quizService.getQuizzesByChapter(req.supabase, chapterId);
      
      res.status(200).json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Error fetching quizzes by chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quizzes'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   get:
 *     summary: Get a specific quiz by ID
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   put:
 *     summary: Update a quiz (Admin only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
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
 *               questions_data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Quiz not found
 */
router.put('/:quizId',
  authenticateToken,
  requireRole(['ADMIN']),
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  validate,
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const updates = {};
      
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.questions_data !== undefined) updates.questionsData = req.body.questions_data;

      const quiz = await quizService.updateQuiz(req.supabase, quizId, updates);

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Error updating quiz:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update quiz'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   delete:
 *     summary: Delete a quiz (Admin only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Quiz not found
 */
router.delete('/:quizId',
  authenticateToken,
  requireRole(['ADMIN']),
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  validate,
  async (req, res) => {
    try {
      const { quizId } = req.params;
      await quizService.deleteQuiz(req.supabase, quizId);

      res.status(200).json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete quiz'
        }
      });
    }
  }
);

router.get('/:quizId',
  authenticateToken,
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  validate,
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const quiz = await quizService.getQuizById(req.supabase, quizId);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Quiz not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Error fetching quiz:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch quiz'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/{quizId}/attempts:
 *   post:
 *     summary: Submit a quiz attempt
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers_data:
 *                 type: object
 *                 description: Quiz answers data
 *             required:
 *               - answers_data
 *     responses:
 *       201:
 *         description: Quiz attempt submitted successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
router.post('/:quizId/attempts',
  authenticateToken,
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  body('answers_data').notEmpty().withMessage('Answers data is required'),
  validate,
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const { answers_data } = req.body;
      const userId = req.user.user_id;
      
      const attempt = await quizService.createQuizAttempt(req.supabase, {
        quiz_id: quizId,
        user_id: userId,
        answers_data
      });
      
      res.status(201).json({
        success: true,
        data: attempt
      });
    } catch (error) {
      console.error('Error creating quiz attempt:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit quiz attempt'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/quizzes/{quizId}/my-attempts:
 *   get:
 *     summary: Get current user's attempts for a specific quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz attempts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Quiz not found
 */
router.get('/:quizId/my-attempts',
  authenticateToken,
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  validate,
  async (req, res) => {
    try {
      const { quizId } = req.params;
      const userId = req.user.user_id;
      
      const attempts = await quizService.getQuizAttemptsByUserAndQuiz(req.supabase, userId, quizId);
      
      res.status(200).json({
        success: true,
        data: attempts
      });
    } catch (error) {
      console.error('Error fetching user quiz attempts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quiz attempts'
        }
      });
    }
  }
);

module.exports = router;