// src/services/chapterProgressService.js

const chapterProgressService = {
  /**
   * Marks a specific chapter as completed for a given user.
   * If a progress record already exists, it updates it; otherwise, it creates a new one.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @param {string} chapterId - The ID of the chapter to mark as completed.
   * @returns {Promise<object>} The updated or newly created chapter progress object.
   * @throws {Error} If the operation fails.
   */
  markChapterCompleted: async (supabase, userId, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('chapter_progress')
        .upsert(
          {
            user_id: userId,
            chapter_id: chapterId,
            is_completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,chapter_id' } // Conflict target for upsert
        )
        .select()
        .single();

      if (error) {
        console.error('Error marking chapter completed:', error);
        throw new Error(`Failed to mark chapter ${chapterId} as completed for user ${userId}: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in markChapterCompleted service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a user's progress for a specific chapter.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @param {string} chapterId - The ID of the chapter.
   * @returns {Promise<object|null>} The chapter progress object, or null if no record exists.
   * @throws {Error} If fetching progress fails.
   */
  getChapterProgressByUserAndChapter: async (supabase, userId, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('chapter_progress')
        .select(`
          *,
          users ( user_id, email, first_name, last_name ),
          chapters ( chapter_id, title, order_index )
        `)
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching chapter progress by user and chapter:', error);
        throw new Error(`Failed to fetch chapter progress: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getChapterProgressByUserAndChapter service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all chapter progress records for a specific user, optionally filtered by course.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @param {string} [courseId] - Optional. If provided, filters progress for chapters within this course.
   * @returns {Promise<Array<object>>} An array of chapter progress objects.
   * @throws {Error} If fetching progress fails.
   */
  getChapterProgressForUser: async (supabase, userId, courseId = null) => {
    try {
      let query = supabase
        .from('chapter_progress')
        .select(`
          *,
          chapters ( chapter_id, course_id, title, order_index )
        `)
        .eq('user_id', userId);

      if (courseId) {
        // This requires a join or subquery to filter by course_id from chapters table.
        // Supabase's .select() can do this implicitly if the relationship is defined.
        query = query.in('chapter_id', supabase.from('chapters').select('chapter_id').eq('course_id', courseId));
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chapter progress for user:', error);
        throw new Error(`Failed to fetch user's chapter progress: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getChapterProgressForUser service:', error);
      throw error;
    }
  },

  /**
   * Checks if a user has completed all chapters for a given course.
   * This is a critical function for certificate generation eligibility.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @param {string} courseId - The ID of the course.
   * @returns {Promise<boolean>} True if all chapters are completed, false otherwise.
   * @throws {Error} If the check fails.
   */
  checkCourseCompletion: async (supabase, userId, courseId) => {
    try {
      // Get all chapters for the course
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('chapter_id')
        .eq('course_id', courseId);

      if (chaptersError) {
        console.error('Error fetching chapters for course completion check:', chaptersError);
        throw new Error(`Failed to fetch chapters for course ${courseId}: ${chaptersError.message}`);
      }

      if (!chapters || chapters.length === 0) {
        // If there are no chapters, consider the course completed (or handle as an error/edge case)
        return true;
      }

      const chapterIds = chapters.map(c => c.chapter_id);

      // Get the user's completed chapters for this course
      const { data: completedProgress, error: progressError } = await supabase
        .from('chapter_progress')
        .select('chapter_id')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .in('chapter_id', chapterIds); // Filter by chapters belonging to this course

      if (progressError) {
        console.error('Error fetching user progress for course completion check:', progressError);
        throw new Error(`Failed to fetch user progress for course ${courseId}: ${progressError.message}`);
      }

      // Check if the number of completed chapters matches the total number of chapters
      return completedProgress.length === chapterIds.length;

    } catch (error) {
      console.error('Error in checkCourseCompletion service:', error);
      throw error;
    }
  },
};

module.exports = chapterProgressService;
