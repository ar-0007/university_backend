// src/services/chapterService.js

const chapterService = {
  /**
   * Creates a new chapter in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} chapterInput - The input data for the new chapter (courseId, title, description, orderIndex).
   * @returns {Promise<object>} The newly created chapter object.
   * @throws {Error} If the chapter creation fails.
   */
  createChapter: async (supabase, chapterInput) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert([
          {
            course_id: chapterInput.courseId,
            title: chapterInput.title,
            description: chapterInput.description,
            order_index: chapterInput.orderIndex,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating chapter:', error);
        throw new Error(`Failed to create chapter: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createChapter service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all chapters for a specific course.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} courseId - The UUID of the course.
   * @returns {Promise<Array<object>>} An array of chapter objects.
   * @throws {Error} If fetching chapters fails.
   */
  getChaptersByCourse: async (supabase, courseId) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching chapters by course ID:', error);
        throw new Error(`Failed to fetch chapters: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getChaptersByCourse service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single chapter by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the chapter.
   * @returns {Promise<object|null>} The chapter object, or null if not found.
   * @throws {Error} If fetching the chapter fails.
   */
  getChapterById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('chapter_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching chapter by ID:', error);
        throw new Error(`Failed to fetch chapter: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getChapterById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing chapter in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the chapter to update.
   * @param {object} updates - An object containing the fields to update (title, description, orderIndex).
   * @returns {Promise<object>} The updated chapter object.
   * @throws {Error} If the chapter update fails.
   */
  updateChapter: async (supabase, id, updates) => {
    try {
      const updateData = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;

      const { data, error } = await supabase
        .from('chapters')
        .update(updateData)
        .eq('chapter_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating chapter:', error);
        throw new Error(`Failed to update chapter: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateChapter service:', error);
      throw error;
    }
  },

  /**
   * Deletes a chapter from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the chapter to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the chapter deletion fails.
   */
  deleteChapter: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('chapter_id', id);

      if (error) {
        console.error('Error deleting chapter:', error);
        throw new Error(`Failed to delete chapter: ${error.message}`);
      }
      console.log(`Chapter ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteChapter service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all chapters from the database.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of all chapter objects.
   * @throws {Error} If fetching chapters fails.
   */
  getAllChapters: async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          courses ( course_id, title )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all chapters:', error);
        throw new Error(`Failed to fetch chapters: ${error.message}`);
      }
      return data || [];
    } catch (error) {
      console.error('Error in getAllChapters service:', error);
      throw error;
    }
  },
};

module.exports = chapterService;
