// src/controllers/videoProgressController.js
const videoProgressService = require('../services/videoProgressService');
const { validationResult } = require('express-validator');

const videoProgressController = {
  /**
   * Update video progress for a user
   * POST /api/video-progress
   */
  updateVideoProgress: async (req, res, next) => {
    try {
      // Check for validation errors
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

      const { courseId, videoUrl, currentTime, totalDuration, chapterId } = req.body;
      const userId = req.user.user_id;

      const progress = await videoProgressService.updateVideoProgress(
        req.supabase,
        userId,
        courseId,
        videoUrl,
        currentTime,
        totalDuration,
        chapterId
      );

      res.status(200).json({
        success: true,
        data: progress,
        message: 'Video progress updated successfully'
      });
    } catch (error) {
      console.error('Error in updateVideoProgress controller:', error);
      next(error);
    }
  },

  /**
   * Get video progress for a specific video
   * GET /api/video-progress/:courseId/:videoUrl
   */
  getVideoProgress: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const videoUrl = decodeURIComponent(req.params.videoUrl);
      const userId = req.user.user_id;

      const progress = await videoProgressService.getVideoProgress(
        req.supabase,
        userId,
        courseId,
        videoUrl
      );

      res.status(200).json({
        success: true,
        data: progress,
        message: progress ? 'Video progress retrieved successfully' : 'No progress found for this video'
      });
    } catch (error) {
      console.error('Error in getVideoProgress controller:', error);
      next(error);
    }
  },

  /**
   * Get all video progress for a course
   * GET /api/video-progress/course/:courseId
   */
  getCourseVideoProgress: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.user_id;

      const progress = await videoProgressService.getCourseVideoProgress(
        req.supabase,
        userId,
        courseId
      );

      res.status(200).json({
        success: true,
        data: progress,
        message: 'Course video progress retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getCourseVideoProgress controller:', error);
      next(error);
    }
  },

  /**
   * Get all video progress for the authenticated user
   * GET /api/video-progress/my-progress
   */
  getUserVideoProgress: async (req, res, next) => {
    try {
      const userId = req.user.user_id;

      const progress = await videoProgressService.getUserVideoProgress(
        req.supabase,
        userId
      );

      res.status(200).json({
        success: true,
        data: progress,
        message: 'User video progress retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getUserVideoProgress controller:', error);
      next(error);
    }
  },

  /**
   * Get video progress statistics for the authenticated user
   * GET /api/video-progress/stats
   */
  getVideoProgressStats: async (req, res, next) => {
    try {
      const userId = req.user.user_id;

      const stats = await videoProgressService.getVideoProgressStats(
        req.supabase,
        userId
      );

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Video progress statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVideoProgressStats controller:', error);
      next(error);
    }
  },

  /**
   * Get recently watched videos for "Continue Watching" feature
   * GET /api/video-progress/continue-watching
   */
  getRecentlyWatchedVideos: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const limit = parseInt(req.query.limit) || 5;

      const videos = await videoProgressService.getRecentlyWatchedVideos(
        req.supabase,
        userId,
        limit
      );

      res.status(200).json({
        success: true,
        data: videos,
        message: 'Recently watched videos retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getRecentlyWatchedVideos controller:', error);
      next(error);
    }
  }
};

module.exports = videoProgressController;