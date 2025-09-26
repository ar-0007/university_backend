const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');
const submissionService = require('../services/submissionService');
const { documentUpload, uploadDocument } = require('../utils/cloudinaryUploader');



const router = express.Router();

// Configure multer for memory storage (files will be uploaded to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedMimes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and document files are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: Get submissions by assignment ID or all submissions (admin)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignment_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Assignment ID (optional for admin to get all submissions)
 *       - in: query
 *         name: admin
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Get all submissions (admin only)
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin access required)
 *       404:
 *         description: Assignment not found
 */
router.get('/',
  authenticateToken,
  query('assignment_id').optional().isUUID().withMessage('Invalid assignment ID'),
  query('admin').optional().isBoolean().withMessage('Admin flag must be boolean'),
  validate,
  async (req, res) => {
    try {
      const { assignment_id, admin } = req.query;
      const userId = req.user.user_id;
      const userRole = req.user.role;
      
      // If admin flag is true, check if user is admin and get all submissions
      if (admin === 'true') {
        if (userRole !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
        
        // Get all submissions across all assignments using service
        const submissions = await submissionService.getAllSubmissions(req.supabase);
        
        // Transform data to match expected format
        const transformedSubmissions = submissions.map(submission => ({
          submission_id: submission.submission_id,
          assignment_id: submission.assignment_id,
          user_id: submission.user_id,
          submission_text: submission.submission_text,
          cloudinary_url: submission.cloudinary_url,
          grade: submission.grade,
          feedback: submission.feedback,
          submitted_at: submission.submitted_at,
          graded_at: submission.graded_at,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
          status: submission.grade !== null ? 'graded' : 'submitted',
          user: {
            first_name: submission.users?.first_name || 'Unknown',
            last_name: submission.users?.last_name || 'User',
            email: submission.users?.email || 'unknown@example.com'
          },
          assignment: {
            title: submission.assignments?.title || 'Unknown Assignment',
            max_score: submission.assignments?.max_score || 100
          }
        }));
        
        return res.status(200).json({
          success: true,
          data: transformedSubmissions
        });
      }
      
      // Regular user flow - get submissions by user and assignment
      if (!assignment_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Assignment ID is required for non-admin users'
          }
        });
      }
      
      const submissions = await submissionService.getSubmissionsByUserAndAssignment(req.supabase, userId, assignment_id);
      
      res.status(200).json({
        success: true,
        data: submissions
      });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch submissions'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 format: uuid
 *                 description: Assignment ID
 *               submission_text:
 *                 type: string
 *                 description: Text submission
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File submission
 *             required:
 *               - assignment_id
 *     responses:
 *       201:
 *         description: Submission created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.post('/',
  authenticateToken,
  upload.single('file'),
  body('assignment_id').isUUID().withMessage('Invalid assignment ID'),
  validate,
  async (req, res) => {
    try {
      const { assignment_id, submission_text } = req.body;
      const userId = req.user.user_id;
      const file = req.file;
      
      let cloudinaryUrl = null;
      
      // Upload file to Cloudinary if provided
      if (file) {
        try {
          const uploadResult = await uploadDocument(file.buffer, {
            folder: 'detailers-university/submissions',
            public_id: `submission_${userId}_${assignment_id}_${Date.now()}`
          });
          cloudinaryUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload file. Please try again.'
            }
          });
        }
      }
      
      const submissionData = {
        assignment_id,
        user_id: userId,
        submission_text: submission_text || null,
        cloudinary_url: cloudinaryUrl
      };
      
      const submission = await submissionService.createSubmission(req.supabase, submissionData);
      
      res.status(201).json({
        success: true,
        data: submission
      });
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create submission'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/submissions/{submissionId}:
 *   get:
 *     summary: Get a specific submission by ID
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Submission not found
 */
router.get('/:submissionId',
  authenticateToken,
  param('submissionId').isUUID().withMessage('Invalid submission ID'),
  validate,
  async (req, res) => {
    try {
      const { submissionId } = req.params;
      const userId = req.user.user_id;
      
      const submission = await submissionService.getSubmissionById(req.supabase, submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Submission not found'
          }
        });
      }
      
      // Check if user owns this submission or is admin
      if (submission.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: submission
      });
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch submission'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/submissions/{submissionId}/grade:
 *   put:
 *     summary: Grade a submission (Admin only)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grade:
 *                 type: number
 *                 description: Grade/score for the submission
 *               feedback:
 *                 type: string
 *                 description: Feedback for the student
 *             required:
 *               - grade
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Submission not found
 */
router.put('/:submissionId/grade',
  authenticateToken,
  param('submissionId').isUUID().withMessage('Invalid submission ID'),
  body('grade').isNumeric().withMessage('Grade must be a number'),
  body('feedback').optional().isString().withMessage('Feedback must be a string'),
  validate,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      
      const gradedSubmission = await submissionService.gradeSubmission(
        req.supabase, 
        submissionId, 
        grade, 
        feedback || null
      );
      
      res.status(200).json({
        success: true,
        data: gradedSubmission
      });
    } catch (error) {
      console.error('Error grading submission:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to grade submission'
        }
      });
    }
  }
);

module.exports = router;