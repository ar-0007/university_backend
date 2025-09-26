// src/routes/assignmentRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');
const multer = require('multer');

const router = express.Router();

// Configure multer for assignment file uploads (documents and images)
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for assignment files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       properties:
 *         assignment_id:
 *           type: string
 *           format: uuid
 *         course_id:
 *           type: string
 *           format: uuid
 *         chapter_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         assignment_file_url:
 *           type: string
 *         max_score:
 *           type: number
 *         due_date:
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
 * /api/assignments:
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by course ID
 *       - in: query
 *         name: chapter_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by chapter ID
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
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
 *                     $ref: '#/components/schemas/Assignment'
 */

/**
 * @swagger
 * /api/assignments/upload:
 *   post:
 *     summary: Create new assignment with file upload
 *     tags: [Assignments]
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
 *                 description: Assignment title
 *               description:
 *                 type: string
 *                 description: Assignment description
 *               course_id:
 *                 type: string
 *                 format: uuid
 *                 description: Course ID (required if chapter_id not provided)
 *               chapter_id:
 *                 type: string
 *                 format: uuid
 *                 description: Chapter ID (required if course_id not provided)
 *               max_score:
 *                 type: number
 *                 description: Maximum score for the assignment
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Assignment due date
 *               assignment_file:
 *                 type: string
 *                 format: binary
 *                 description: Assignment file (PDF, Word, text, or image)
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Validation error or file upload error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
// GET /api/assignments - Get all assignments
router.get('/', 
  authenticateToken, 
  [
    query('course_id').optional().isUUID().withMessage('Course ID must be a valid UUID'),
    query('chapter_id').optional().isUUID().withMessage('Chapter ID must be a valid UUID')
  ], 
  validate, 
  assignmentController.getAllAssignments
);

router.post('/upload', 
  authenticateToken, 
  requireRole('ADMIN'),
  upload.single('assignment_file'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('course_id').optional().isUUID().withMessage('Course ID must be a valid UUID'),
    body('chapter_id').optional().isUUID().withMessage('Chapter ID must be a valid UUID'),
    body('max_score').optional().isNumeric().withMessage('Max score must be a number'),
    body('due_date').optional().isISO8601().withMessage('Due date must be a valid date')
  ],
  validate,
  assignmentController.createAssignmentWithUpload
);

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create new assignment without file upload
 *     tags: [Assignments]
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
 *               course_id:
 *                 type: string
 *                 format: uuid
 *               chapter_id:
 *                 type: string
 *                 format: uuid
 *               max_score:
 *                 type: number
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               assignment_file_url:
 *                 type: string
 *                 description: URL of pre-uploaded assignment file
 *     responses:
 *       201:
 *         description: Assignment created successfully
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
    body('course_id').optional().isUUID().withMessage('Course ID must be a valid UUID'),
    body('chapter_id').optional().isUUID().withMessage('Chapter ID must be a valid UUID'),
    body('max_score').optional().isNumeric().withMessage('Max score must be a number'),
    body('due_date').optional().isISO8601().withMessage('Due date must be a valid date'),
    body('assignment_file_url').optional().isURL().withMessage('Assignment file URL must be a valid URL')
  ],
  validate,
  assignmentController.createAssignment
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Assignments]
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
 *         description: Assignment retrieved successfully
 *       404:
 *         description: Assignment not found
 */
router.get('/:id', 
  authenticateToken, 
  [param('id').isUUID().withMessage('Assignment ID must be a valid UUID')], 
  validate, 
  assignmentController.getAssignmentById
);

/**
 * @swagger
 * /api/assignments/{id}/upload:
 *   put:
 *     summary: Update assignment with file upload
 *     tags: [Assignments]
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
 *               max_score:
 *                 type: number
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               assignment_file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       404:
 *         description: Assignment not found
 */
router.put('/:id/upload', 
  authenticateToken, 
  requireRole('ADMIN'),
  upload.single('assignment_file'),
  [
    param('id').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('max_score').optional().isNumeric().withMessage('Max score must be a number'),
    body('due_date').optional().isISO8601().withMessage('Due date must be a valid date')
  ],
  validate,
  assignmentController.updateAssignmentWithUpload
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update assignment without file upload
 *     tags: [Assignments]
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
 *               max_score:
 *                 type: number
 *               due_date:
 *                 type: string
 *                 format: date-time
 *               assignment_file_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       404:
 *         description: Assignment not found
 */
router.put('/:id', 
  authenticateToken, 
  requireRole('ADMIN'),
  [
    param('id').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('max_score').optional().isNumeric().withMessage('Max score must be a number'),
    body('due_date').optional().isISO8601().withMessage('Due date must be a valid date'),
    body('assignment_file_url').optional().isURL().withMessage('Assignment file URL must be a valid URL')
  ],
  validate,
  assignmentController.updateAssignment
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Delete assignment
 *     tags: [Assignments]
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
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 */
router.delete('/:id', 
  authenticateToken, 
  requireRole('ADMIN'),
  [param('id').isUUID().withMessage('Assignment ID must be a valid UUID')], 
  validate, 
  assignmentController.deleteAssignment
);

module.exports = router;

