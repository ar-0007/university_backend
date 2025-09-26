const courseService = require('../services/courseService');
const getSupabaseClient = require('../utils/supabaseClient');
const { uploadImage, uploadVideo } = require('../utils/cloudinaryUploader');

const courseController = {
  // GET /api/courses
  getAllCourses: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { isPublished = true } = req.query;
      const courses = await courseService.getAllCourses(supabase, isPublished === 'true');
      
      res.status(200).json({
        success: true,
        data: courses,
        message: 'Courses retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/courses
  createCourse: async (req, res, next) => {
    try {
            const { 
        title, 
        description, 
        price, 
        category_id,
        instructor_id,
        duration_hours,
        level,
        is_published,
        video_series,
        video_part
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Course title is required'
          }
        });
      }

      let thumbnailUrl = null;
      let introVideoUrl = null;

      // Handle thumbnail upload
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        try {          
          // Add more detailed error logging in upload sections
          const thumbnailFile = req.files.thumbnail[0];
          console.log('Uploading thumbnail:', thumbnailFile.originalname, thumbnailFile.size);
          const thumbnailResult = await uploadImage(thumbnailFile.buffer, {
            folder: 'detailers-university/courses/thumbnails',
            public_id: `course_thumbnail_${Date.now()}`,
            resource_type: 'image'
          });
          thumbnailUrl = thumbnailResult.url;
          console.log('Thumbnail uploaded successfully:', thumbnailUrl);
        } catch (uploadError) {
          console.error('Detailed thumbnail upload error:', {
            message: uploadError.message,
            stack: uploadError.stack,
            cloudinaryError: uploadError.error
          });
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload thumbnail image'
            }
          });
        }
      }

      // Handle intro video upload
      if (req.files && req.files.intro_video && req.files.intro_video[0]) {
        try {
          const videoFile = req.files.intro_video[0];
          const videoResult = await uploadVideo(videoFile.buffer, {
            folder: 'detailers-university/courses/intro-videos',
            public_id: `course_intro_${Date.now()}`,
            resource_type: 'video',
            chunk_size: 6000000 // 6MB chunks for large files
          });
          introVideoUrl = videoResult.url;
        } catch (uploadError) {
          console.error('Video upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload intro video'
            }
          });
        }
      }

      const courseInput = {
        title,
        description,
        thumbnailUrl,
        introVideoUrl,
        price: price ? parseFloat(price) : 0,
        categoryId: category_id,
        instructorId: instructor_id,
        durationHours: duration_hours ? parseInt(duration_hours) : 0,
        level: level || 'BEGINNER',
        isPublished: is_published === 'true' || is_published === true,
        videoSeries: video_series,
        videoPart: video_part ? parseInt(video_part) : 1
      };

      console.log('Course input prepared:', courseInput);

      const supabase = getSupabaseClient();
      console.log('Supabase client obtained, calling createCourse service...');
      
      // Test database schema first
      console.log('Testing database schema...');
      const { data: schemaTest, error: schemaError } = await supabase
        .from('courses')
        .select('course_id, title, video_series, video_part')
        .limit(1);
      
      if (schemaError) {
        console.error('Schema test error:', schemaError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SCHEMA_ERROR',
            message: 'Database schema issue detected',
            details: schemaError.message
          }
        });
      }
      
      console.log('Schema test successful, columns exist');
      
      const course = await courseService.createCourse(supabase, courseInput);
      
      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully'
      });
    } catch (error) {
      console.error('Course creation error:', error);
      console.error('Error stack:', error.stack);
      
      // Send a more specific error response
      res.status(500).json({
        success: false,
        error: {
          code: 'COURSE_CREATION_ERROR',
          message: error.message || 'Failed to create course',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },

  // GET /api/courses/categories
  getCategories: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const categories = await courseService.getAllCategories(supabase);
      
      res.status(200).json({
        success: true,
        data: categories,
        message: 'Categories retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/courses/categories
  createCategory: async (req, res, next) => {
    try {
      const { name, description, slug, isActive } = req.body;
  
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category name and slug are required'
          }
        });
      }
  
      const categoryInput = { name, description, slug, isActive };
      const supabase = getSupabaseClient();
      const category = await courseService.createCategory(supabase, categoryInput);
      
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/courses/categories/:id
  deleteCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      await courseService.deleteCategory(supabase, id);
      
      res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/courses/video-series
  getVideoSeries: async (req, res, next) => {
    try {
      console.log('getVideoSeries controller called');
      
      // First, let's test if we can connect to the database
      const supabase = getSupabaseClient();
      
      // Test query to see if courses table exists and has data
      const { data: testData, error: testError } = await supabase
        .from('courses')
        .select('course_id, title')
        .limit(1);
      
      if (testError) {
        console.error('Test query error:', testError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database connection test failed'
          }
        });
      }
      
      
      const videoSeries = await courseService.getVideoSeries(supabase);
      
      
      res.status(200).json({
        success: true,
        data: videoSeries,
        message: 'Video series retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVideoSeries controller:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error'
        }
      });
    }
  },
  
  // GET /api/courses/:id
  getCourseById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const course = await courseService.getCourseById(supabase, id);
       
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Course not found'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: course,
        message: 'Course retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  // PUT /api/courses/:id
  updateCourse: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      
      let thumbnailUrl = null;
      let introVideoUrl = null;

      // Handle thumbnail upload
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        try {
          const thumbnailFile = req.files.thumbnail[0];
          const thumbnailResult = await uploadImage(thumbnailFile.buffer, {
            folder: 'detailers-university/courses/thumbnails',
            public_id: `course_thumbnail_${id}_${Date.now()}`,
            resource_type: 'image'
          });
          updates.thumbnailUrl = thumbnailResult.url;
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload thumbnail image'
            }
          });
        }
      }

      // Handle intro video upload
      if (req.files && req.files.intro_video && req.files.intro_video[0]) {
        try {
          const videoFile = req.files.intro_video[0];
          const videoResult = await uploadVideo(videoFile.buffer, {
            folder: 'detailers-university/courses/intro-videos',
            public_id: `course_intro_${id}_${Date.now()}`,
            resource_type: 'video',
            chunk_size: 6000000 // 6MB chunks for large files
          });
          updates.introVideoUrl = videoResult.url;
        } catch (uploadError) {
          console.error('Video upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload intro video'
            }
          });
        }
      }

      // Convert string values to appropriate types
      if (updates.price) updates.price = parseFloat(updates.price);
      if (updates.duration_hours) updates.duration_hours = parseInt(updates.duration_hours);
      if (updates.is_published) updates.isPublished = updates.is_published === 'true' || updates.is_published === true;
      
      const supabase = getSupabaseClient();
      const course = await courseService.updateCourse(supabase, id, updates);
      
      res.status(200).json({
        success: true,
        data: course,
        message: 'Course updated successfully'
      });
    } catch (error) {
      console.error('Course update error:', error);
      next(error);
    }
  },
  
  // DELETE /api/courses/:id
  deleteCourse: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      await courseService.deleteCourse(supabase, id);
      
      res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/courses/series/:seriesName
  getCoursesBySeries: async (req, res, next) => {
    try {
      const { seriesName } = req.params;
      const supabase = getSupabaseClient();
      const courses = await courseService.getCoursesBySeries(supabase, seriesName);
      
      res.status(200).json({
        success: true,
        data: courses,
        message: `Courses for series '${seriesName}' retrieved successfully`
      });
    } catch (error) {
      next(error);
    }
  }
}
  
module.exports = courseController;

