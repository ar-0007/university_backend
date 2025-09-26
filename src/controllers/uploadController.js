// src/controllers/uploadController.js
const { 
  uploadVideo, 
  uploadImage, 
  uploadDocument, 
  deleteFile, 
  generateSignedUploadUrl 
} = require('../utils/cloudinaryUploader');

const uploadController = {
  // POST /api/uploads/video
  uploadVideoFile: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No video file provided'
          }
        });
      }

      // File is already uploaded to Cloudinary via multer middleware
      const result = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      res.status(201).json({
        success: true,
        data: result,
        message: 'Video uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/uploads/image
  uploadImageFile: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No image file provided'
          }
        });
      }

      // File is already uploaded to Cloudinary via multer middleware
      const result = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      res.status(201).json({
        success: true,
        data: result,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/uploads/document
  uploadDocumentFile: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No document file provided'
          }
        });
      }

      // File is already uploaded to Cloudinary via multer middleware
      const result = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      res.status(201).json({
        success: true,
        data: result,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/uploads/multiple
  uploadMultipleFiles: async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files provided'
          }
        });
      }

      const results = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));

      res.status(201).json({
        success: true,
        data: results,
        message: `${results.length} files uploaded successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/uploads/:publicId
  deleteFile: async (req, res, next) => {
    try {
      const { publicId } = req.params;
      const { resourceType = 'auto' } = req.query;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PUBLIC_ID',
            message: 'Public ID is required'
          }
        });
      }

      const result = await deleteFile(publicId, resourceType);

      if (result.result === 'ok') {
        res.status(200).json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found or already deleted'
          }
        });
      }
    } catch (error) {
      next(error);
    }
  },

  // POST /api/uploads/signed-url
  getSignedUploadUrl: async (req, res, next) => {
    try {
      const { 
        resourceType = 'auto', 
        folder = 'detailers-university',
        transformation 
      } = req.body;

      const options = {
        resource_type: resourceType,
        folder: folder
      };

      if (transformation) {
        options.transformation = transformation;
      }

      const signedUrl = generateSignedUploadUrl(options);

      res.status(200).json({
        success: true,
        data: signedUrl,
        message: 'Signed upload URL generated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/uploads/progress/:uploadId
  getUploadProgress: async (req, res, next) => {
    try {
      // This would typically integrate with a progress tracking system
      // For now, return a placeholder response
      const { uploadId } = req.params;

      res.status(200).json({
        success: true,
        data: {
          uploadId,
          progress: 100,
          status: 'completed',
          message: 'Upload progress tracking not implemented yet'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/uploads/video/chunked
  uploadVideoChunked: async (req, res, next) => {
    try {
      // Placeholder for chunked video upload implementation
      // This would handle large video files in chunks
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Chunked video upload not implemented yet'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/uploads/stats
  getUploadStats: async (req, res, next) => {
    try {
      // This would typically return upload statistics
      // For now, return placeholder data
      res.status(200).json({
        success: true,
        data: {
          totalUploads: 0,
          totalSize: 0,
          videoCount: 0,
          imageCount: 0,
          documentCount: 0,
          message: 'Upload statistics not implemented yet'
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = uploadController;

