// src/routes/uploadRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const uploadController = require('../controllers/uploadController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');
const { validate } = require('../middleware/validation');
const { videoUpload, imageUpload, documentUpload } = require('../utils/cloudinaryUploader');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: Cloudinary URL of the uploaded file
 *             publicId:
 *               type: string
 *               description: Cloudinary public ID
 *             originalName:
 *               type: string
 *               description: Original filename
 *             size:
 *               type: integer
 *               description: File size in bytes
 *             mimetype:
 *               type: string
 *               description: MIME type of the file
 *         message:
 *           type: string
 *     SignedUrlRequest:
 *       type: object
 *       properties:
 *         resourceType:
 *           type: string
 *           enum: [auto, image, video, raw]
 *           default: auto
 *           description: Type of resource to upload
 *         folder:
 *           type: string
 *           default: detailers-university
 *           description: Cloudinary folder path
 *         transformation:
 *           type: object
 *           description: Cloudinary transformation parameters
 *     SignedUrlResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: Cloudinary upload URL
 *             params:
 *               type: object
 *               description: Upload parameters including signature
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/uploads/video:
 *   post:
 *     summary: Upload video file to Cloudinary
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file to upload (max 500MB)
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file provided or invalid file type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       413:
 *         description: File too large
 */
// Fix video upload route
router.post("/video", 
  authenticateToken, 
  requireRole("ADMIN"), // Changed from "admin" to "ADMIN"
  videoUpload.single("video"), 
  uploadController.uploadVideoFile
);

// Fix image upload route
router.post("/image", 
  authenticateToken, 
  requireRole(["ADMIN", "STUDENT"]), // Changed from ["admin", "student"] to ["ADMIN", "STUDENT"]
  imageUpload.single("image"), 
  uploadController.uploadImageFile
);

// Fix other routes
router.post("/multiple", 
  authenticateToken, 
  requireRole("ADMIN"), // Changed from "admin" to "ADMIN"
  imageUpload.array("files", 10),
  uploadController.uploadMultipleFiles
);

router.delete('/:publicId', 
  authenticateToken, 
  requireRole('ADMIN'), // Changed from 'admin' to 'ADMIN'
  [
    param('publicId').isString().trim(),
    query('resourceType').optional().isIn(['auto', 'image', 'video', 'raw'])
  ], 
  validate, 
  uploadController.deleteFile
);

router.post('/video/chunked', 
  authenticateToken, 
  requireRole('ADMIN'), // Changed from 'admin' to 'ADMIN'
  uploadController.uploadVideoChunked
);

router.get('/stats', 
  authenticateToken, 
  requireRole('ADMIN'), // Changed from 'admin' to 'ADMIN'
  uploadController.getUploadStats
);

module.exports = router;

