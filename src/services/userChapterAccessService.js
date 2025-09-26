// src/services/userChapterAccessService.js

const userChapterAccessService = {
  /**
   * Unlocks all chapters for a user when they purchase/enroll in a course
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} courseId - The ID of the course
   * @returns {Promise<Array<object>>} Array of unlocked chapter access records
   * @throws {Error} If the operation fails
   */
  unlockAllChaptersForCourse: async (supabase, userId, courseId) => {
    try {
      // Get all chapters for the course
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('chapter_id')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (chaptersError) {
        console.error('Error fetching chapters for course:', chaptersError);
        throw new Error(`Failed to fetch chapters for course ${courseId}: ${chaptersError.message}`);
      }

      if (!chapters || chapters.length === 0) {
        console.log(`No chapters found for course ${courseId}`);
        return [];
      }

      // Create access records for all chapters
      const accessRecords = chapters.map(chapter => ({
        user_id: userId,
        chapter_id: chapter.chapter_id,
        is_unlocked: true,
        unlocked_at: new Date().toISOString()
      }));

      // Insert all access records (use upsert to handle duplicates)
      const { data, error } = await supabase
        .from('user_chapter_access')
        .upsert(accessRecords, { onConflict: 'user_id,chapter_id' })
        .select();

      if (error) {
        console.error('Error creating chapter access records:', error);
        throw new Error(`Failed to unlock chapters for user ${userId}: ${error.message}`);
      }

      console.log(`✅ Successfully unlocked ${chapters.length} chapters for user ${userId} in course ${courseId}`);
      return data;
    } catch (error) {
      console.error('Error in unlockAllChaptersForCourse service:', error);
      throw error;
    }
  },

  /**
   * Gets all unlocked chapters for a user in a specific course
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} courseId - The ID of the course
   * @returns {Promise<Array<object>>} Array of unlocked chapters with access info
   * @throws {Error} If the operation fails
   */
  getUnlockedChaptersForCourse: async (supabase, userId, courseId) => {
    try {
      const { data, error } = await supabase
        .from('user_chapter_access')
        .select(`
          *,
          chapters (
            chapter_id,
            course_id,
            title,
            description,
            order_index,
            is_unlocked_by_default
          )
        `)
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .eq('chapters.course_id', courseId)
        .order('chapters(order_index)', { ascending: true });

      if (error) {
        console.error('Error fetching unlocked chapters:', error);
        throw new Error(`Failed to fetch unlocked chapters: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUnlockedChaptersForCourse service:', error);
      throw error;
    }
  },

  /**
   * Checks if a specific chapter is unlocked for a user
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} chapterId - The ID of the chapter
   * @returns {Promise<boolean>} True if chapter is unlocked, false otherwise
   * @throws {Error} If the operation fails
   */
  isChapterUnlocked: async (supabase, userId, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('user_chapter_access')
        .select('is_unlocked')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error checking chapter access:', error);
        throw new Error(`Failed to check chapter access: ${error.message}`);
      }

      // If no record exists, check if chapter is unlocked by default
      if (!data) {
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('is_unlocked_by_default')
          .eq('chapter_id', chapterId)
          .single();

        if (chapterError) {
          console.error('Error fetching chapter default unlock status:', chapterError);
          return false;
        }

        return chapter?.is_unlocked_by_default || false;
      }

      return data.is_unlocked || false;
    } catch (error) {
      console.error('Error in isChapterUnlocked service:', error);
      throw error;
    }
  },

  /**
   * Unlocks a specific chapter for a user (for future use if needed)
   * @param {object} supabase - The Supabase client instance
   * @param {string} userId - The ID of the user
   * @param {string} chapterId - The ID of the chapter
   * @returns {Promise<object>} The chapter access record
   * @throws {Error} If the operation fails
   */
  unlockChapter: async (supabase, userId, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('user_chapter_access')
        .upsert(
          {
            user_id: userId,
            chapter_id: chapterId,
            is_unlocked: true,
            unlocked_at: new Date().toISOString()
          },
          { onConflict: 'user_id,chapter_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error unlocking chapter:', error);
        throw new Error(`Failed to unlock chapter ${chapterId} for user ${userId}: ${error.message}`);
      }

      console.log(`✅ Chapter ${chapterId} unlocked for user ${userId}`);
      return data;
    } catch (error) {
      console.error('Error in unlockChapter service:', error);
      throw error;
    }
  }
};

module.exports = userChapterAccessService;