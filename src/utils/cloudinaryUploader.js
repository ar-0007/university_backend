// src/utils/cloudinaryUploader.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary
const createCloudinaryStorage = (resourceType = 'auto', folder = 'detailers-university') => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: resourceType === 'video' 
        ? ['mp4', 'mov', 'avi', 'mkv', 'webm']
        : resourceType === 'image'
        ? ['jpg', 'jpeg', 'png', 'gif', 'webp']
        : ['pdf', 'doc', 'docx', 'txt'],
      transformation: resourceType === 'video' 
        ? [{ quality: 'auto', fetch_format: 'auto' }]
        : resourceType === 'image'
        ? [{ quality: 'auto', fetch_format: 'auto', width: 1920, height: 1080, crop: 'limit' }]
        : undefined,
    },
  });
};

// Create multer instances for different file types with increased timeout
const videoUpload = multer({
  storage: createCloudinaryStorage('video', 'detailers-university/videos'),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
  }
});

const imageUpload = multer({
  storage: createCloudinaryStorage('image', 'detailers-university/images'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'), false);
    }
  }
});

const documentUpload = multer({
  storage: createCloudinaryStorage('raw', 'detailers-university/documents'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and text documents are allowed.'), false);
    }
  }
});

// Direct upload functions with buffer support and improved timeout handling
const uploadVideo = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'detailers-university/videos',
          quality: 'auto',
          fetch_format: 'auto',
          timeout: 300000, // 5 minutes timeout
          chunk_size: 6000000, // 6MB chunks
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('Video upload error:', error);
            reject(new Error(`Video upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              duration: result.duration,
              width: result.width,
              height: result.height,
              bytes: result.bytes
            });
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Video upload failed: ${error.message}`);
  }
};

const uploadImage = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'detailers-university/images',
          quality: 'auto',
          fetch_format: 'auto',
          width: 1920,
          height: 1080,
          crop: 'limit',
          timeout: 120000, // 2 minutes timeout
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('Image upload error:', error);
            reject(new Error(`Image upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              bytes: result.bytes
            });
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

const uploadDocument = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'detailers-university/documents',
          timeout: 180000, // 3 minutes timeout
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('Document upload error:', error);
            reject(new Error(`Document upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              bytes: result.bytes
            });
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new Error(`Document upload failed: ${error.message}`);
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return result;
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

// Generate signed upload URL for frontend uploads
const generateSignedUploadUrl = (options = {}) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const params = {
    timestamp: timestamp,
    folder: 'detailers-university',
    ...options
  };
  
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  
  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    params: {
      ...params,
      signature: signature,
      api_key: process.env.CLOUDINARY_API_KEY
    }
  };
};

module.exports = {
  cloudinary,
  videoUpload,
  imageUpload,
  documentUpload,
  uploadVideo,
  uploadImage,
  uploadDocument,
  deleteFile,
  generateSignedUploadUrl
};

