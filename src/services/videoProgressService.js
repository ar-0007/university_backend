// src/services/videoProgressService.js

const videoProgressService = {
  /**
   * Updates or creates video progress for a user
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} courseId - The ID of the course
   * @param {string} videoUrl - The URL of the video
   * @param {number} currentTime - Current playback time in seconds
   * @param {number} totalDuration - Total video duration in seconds
   * @param {string} [chapterId] - Optional chapter ID if video belongs to a chapter
   * @returns {Promise<object>} The updated or created video progress object
   */
  updateVideoProgress: async (supabase, userId, courseId, videoUrl, currentTime, totalDuration, chapterId = null) => {
    try {
      const watchPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
      const isCompleted = watchPercentage >= 90; // Consider completed if 90% watched

      const progressData = {
        user_id: userId,
        course_id: courseId,
        chapter_id: chapterId,
        video_url: videoUrl,
        current_position: currentTime,
        total_duration: totalDuration,
        watch_percentage: Math.min(watchPercentage, 100),
        is_completed: isCompleted,
        last_watched_at: new Date().toISOString(),
        ...(isCompleted && { completed_at: new Date().toISOString() })
      };

      const { data, error } = await supabase
        .from('video_progress')
        .upsert(progressData, { onConflict: 'user_id,course_id,video_url' })
        .select()
        .single();

      if (error) {
        console.error('Error updating video progress:', error);
        throw new Error(`Failed to update video progress: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateVideoProgress service:', error);
      throw error;
    }
  },

  /**
   * Gets video progress for a specific user and video
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} courseId - The ID of the course
   * @param {string} videoUrl - The URL of the video
   * @returns {Promise<object|null>} The video progress object or null if not found
   */
  getVideoProgress: async (supabase, userId, courseId, videoUrl) => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('video_url', videoUrl)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching video progress:', error);
        throw new Error(`Failed to fetch video progress: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getVideoProgress service:', error);
      throw error;
    }
  },

  /**
   * Gets all video progress for a user in a specific course
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} courseId - The ID of the course
   * @returns {Promise<Array>} Array of video progress objects
   */
  getCourseVideoProgress: async (supabase, userId, courseId) => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('last_watched_at', { ascending: false });

      if (error) {
        console.error('Error fetching course video progress:', error);
        throw new Error(`Failed to fetch course video progress: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCourseVideoProgress service:', error);
      throw error;
    }
  },

  /**
   * Gets all video progress for a user across all courses
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @returns {Promise<Array>} Array of video progress objects with course info
   */
  getUserVideoProgress: async (supabase, userId) => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select(`
          *,
          courses (
            course_id,
            title,
            thumbnail_url,
            video_series,
            video_part
          )
        `)
        .eq('user_id', userId)
        .order('last_watched_at', { ascending: false });

      if (error) {
        console.error('Error fetching user video progress:', error);
        throw new Error(`Failed to fetch user video progress: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserVideoProgress service:', error);
      throw error;
    }
  },

  /**
   * Gets video progress statistics for a user
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @returns {Promise<object>} Statistics object with total videos, completed, in progress, etc.
   */
  getVideoProgressStats: async (supabase, userId) => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select('is_completed, watch_percentage, total_duration')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching video progress stats:', error);
        throw new Error(`Failed to fetch video progress stats: ${error.message}`);
      }

      const stats = {
        totalVideos: data.length,
        completedVideos: data.filter(v => v.is_completed).length,
        inProgressVideos: data.filter(v => !v.is_completed && v.watch_percentage > 0).length,
        totalWatchTime: data.reduce((sum, v) => sum + (v.total_duration * (v.watch_percentage / 100)), 0),
        averageProgress: data.length > 0 ? data.reduce((sum, v) => sum + v.watch_percentage, 0) / data.length : 0
      };

      return stats;
    } catch (error) {
      console.error('Error in getVideoProgressStats service:', error);
      throw error;
    }
  },

  /**
   * Gets the most recently watched videos for a user (for "Continue Watching" feature)
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {number} limit - Maximum number of videos to return
   * @returns {Promise<Array>} Array of recently watched video progress objects
   */
  getRecentlyWatchedVideos: async (supabase, userId, limit = 5) => {
    try {
      const { data, error } = await supabase
        .from('video_progress')
        .select(`
          *,
          courses (
            course_id,
            title,
            thumbnail_url,
            video_series,
            video_part,
            intro_video_url
          )
        `)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .gt('watch_percentage', 5) // Only videos with more than 5% progress
        .order('last_watched_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recently watched videos:', error);
        throw new Error(`Failed to fetch recently watched videos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentlyWatchedVideos service:', error);
      throw error;
    }
  }
};

module.exports = videoProgressService;