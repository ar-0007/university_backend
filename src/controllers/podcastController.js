const podcastService = require('../services/podcastService');
const getSupabaseClient = require('../utils/supabaseClient');
const { uploadVideo, uploadImage } = require('../utils/cloudinaryUploader');

const podcastController = {
  // GET /api/podcasts/public - Public endpoint for published podcasts
  getPublishedPodcasts: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      
      // Only return published podcasts for public access
      const podcasts = await podcastService.getAllPodcasts(supabase, 'published');
      
      res.status(200).json({
        success: true,
        data: podcasts,
        message: 'Published podcasts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/podcasts - Admin endpoint for all podcasts
  getAllPodcasts: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { status } = req.query;
      
      const podcasts = await podcastService.getAllPodcasts(supabase, status);
      
      res.status(200).json({
        success: true,
        data: podcasts,
        message: 'Podcasts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/podcasts/upload
  createPodcastWithUpload: async (req, res, next) => {
    try {
      console.log('📝 Podcast creation request body:', req.body);
      console.log('📝 Podcast creation files:', req.files);
      console.log('📝 Request headers:', req.headers);
      console.log('📝 Content-Type:', req.get('Content-Type'));
      
      const {
        title,
        description,
        status,
        scheduled_at
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Podcast title is required'
          }
        });
      }

      // Check if video file is provided
      if (!req.files || !req.files.video || !req.files.video[0]) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video file is required'
          }
        });
      }

      let videoUrl = null;
      let thumbnailUrl = null;
      let duration = null;

      // Handle video upload
      try {
        const videoFile = req.files.video[0];
        const videoResult = await uploadVideo(videoFile.buffer, {
          folder: 'detailers-university/podcasts/videos',
          public_id: `podcast_video_${Date.now()}`,
          resource_type: 'video'
        });
        videoUrl = videoResult.url;
        duration = videoResult.duration;
      } catch (uploadError) {
        console.error('Video upload error:', uploadError);
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'Failed to upload video file'
          }
        });
      }

      // Handle thumbnail upload (optional)
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        try {
          const thumbnailFile = req.files.thumbnail[0];
          const thumbnailResult = await uploadImage(thumbnailFile.buffer, {
            folder: 'detailers-university/podcasts/thumbnails',
            public_id: `podcast_thumbnail_${Date.now()}`,
            resource_type: 'image'
          });
          thumbnailUrl = thumbnailResult.url;
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError);
          // Don't fail the entire request for thumbnail upload failure
          console.warn('Continuing without thumbnail due to upload error');
        }
      }

      const podcastInput = {
        title,
        description,
        videoUrl,
        thumbnailUrl,
        duration: duration ? Math.round(duration) : null,
        status: status || 'draft',
        scheduledAt: scheduled_at
      };

      const supabase = getSupabaseClient();
      const podcast = await podcastService.createPodcast(supabase, podcastInput);
      
      res.status(201).json({
        success: true,
        data: podcast,
        message: 'Podcast created successfully'
      });
    } catch (error) {
      console.error('❌ Podcast creation error:', error);
      
      // Send more specific error message
      if (error.message.includes('Failed to create podcast')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message
          }
        });
      }
      
      next(error);
    }
  },

  // POST /api/podcasts
  createPodcast: async (req, res, next) => {
    try {
      const {
        title,
        description,
        video_url,
        thumbnail_url,
        duration,
        status,
        scheduled_at
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Podcast title is required'
          }
        });
      }

      if (!video_url) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video URL is required'
          }
        });
      }

      const podcastInput = {
        title,
        description,
        videoUrl: video_url,
        thumbnailUrl: thumbnail_url,
        duration: duration ? parseInt(duration) : null,
        status: status || 'draft',
        scheduledAt: scheduled_at
      };

      const supabase = getSupabaseClient();
      const podcast = await podcastService.createPodcast(supabase, podcastInput);
      
      res.status(201).json({
        success: true,
        data: podcast,
        message: 'Podcast created successfully'
      });
    } catch (error) {
      console.error('Podcast creation error:', error);
      next(error);
    }
  },

  // GET /api/podcasts/:id
  getPodcastById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const podcast = await podcastService.getPodcastById(supabase, id);
       
      if (!podcast) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Podcast not found'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: podcast,
        message: 'Podcast retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/podcasts/:id/upload
  updatePodcastWithUpload: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      
      // Handle scheduled_at field
      if (updates.scheduled_at) {
        updates.scheduledAt = updates.scheduled_at;
      }

      // Handle video upload
      if (req.files && req.files.video && req.files.video[0]) {
        try {
          const videoFile = req.files.video[0];
          const videoResult = await uploadVideo(videoFile.buffer, {
            folder: 'detailers-university/podcasts/videos',
            public_id: `podcast_video_${id}_${Date.now()}`,
            resource_type: 'video'
          });
          updates.videoUrl = videoResult.url;
          updates.duration = videoResult.duration ? Math.round(videoResult.duration) : null;
        } catch (uploadError) {
          console.error('Video upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload video file'
            }
          });
        }
      }

      // Handle thumbnail upload
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        try {
          const thumbnailFile = req.files.thumbnail[0];
          const thumbnailResult = await uploadImage(thumbnailFile.buffer, {
            folder: 'detailers-university/podcasts/thumbnails',
            public_id: `podcast_thumbnail_${id}_${Date.now()}`,
            resource_type: 'image'
          });
          updates.thumbnailUrl = thumbnailResult.url;
        } catch (uploadError) {
          console.error('Thumbnail upload error:', uploadError);
          // Don't fail the entire request for thumbnail upload failure
          console.warn('Continuing without thumbnail update due to upload error');
        }
      }

      const supabase = getSupabaseClient();
      const podcast = await podcastService.updatePodcast(supabase, id, updates);
      
      res.status(200).json({
        success: true,
        data: podcast,
        message: 'Podcast updated successfully'
      });
    } catch (error) {
      console.error('Podcast update error:', error);
      next(error);
    }
  },

  // PUT /api/podcasts/:id
  updatePodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      
      // Convert string values to appropriate types
      if (updates.video_url) updates.videoUrl = updates.video_url;
      if (updates.thumbnail_url) updates.thumbnailUrl = updates.thumbnail_url;
      if (updates.duration) updates.duration = parseInt(updates.duration);
      if (updates.scheduled_at) updates.scheduledAt = updates.scheduled_at;
      
      const supabase = getSupabaseClient();
      const podcast = await podcastService.updatePodcast(supabase, id, updates);
      
      res.status(200).json({
        success: true,
        data: podcast,
        message: 'Podcast updated successfully'
      });
    } catch (error) {
      console.error('Podcast update error:', error);
      next(error);
    }
  },
  
  // DELETE /api/podcasts/:id
  deletePodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      await podcastService.deletePodcast(supabase, id);
      
      res.status(200).json({
        success: true,
        message: 'Podcast deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/podcasts/:id/publish
  publishPodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const podcast = await podcastService.publishPodcast(supabase, id);
      
      res.status(200).json({
        success: true,
        data: podcast,
        message: 'Podcast published successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/podcasts/:id/archive
  archivePodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const podcast = await podcastService.archivePodcast(supabase, id);
      
      res.status(200).json({
        success: true,
        data: podcast,
        message: 'Podcast archived successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/podcasts/:id/like
  likePodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      const supabase = getSupabaseClient();
      
      await podcastService.likePodcast(supabase, id, userId);
      
      res.status(200).json({
        success: true,
        message: 'Podcast liked successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/podcasts/:id/like
  unlikePodcast: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      const supabase = getSupabaseClient();
      
      await podcastService.unlikePodcast(supabase, id, userId);
      
      res.status(200).json({
        success: true,
        message: 'Podcast unliked successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/podcasts/liked
  getLikedPodcasts: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const supabase = getSupabaseClient();
      
      const likedPodcasts = await podcastService.getLikedPodcasts(supabase, userId);
      
      res.status(200).json({
        success: true,
        data: likedPodcasts,
        message: 'Liked podcasts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = podcastController;

