// src/services/chapterMediaService.js

const chapterMediaService = {
  /**
   * Creates a new chapter media entry in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} mediaInput - The input data for the new media (chapterId, mediaType, cloudinaryUrl, fileName, description, orderIndex).
   * @returns {Promise<object>} The newly created chapter media object.
   * @throws {Error} If the media creation fails.
   */
  createChapterMedia: async (supabase, mediaInput) => {
    try {
      const { data, error } = await supabase
        .from('chapter_media')
        .insert([
          {
            chapter_id: mediaInput.chapterId,
            media_type: mediaInput.mediaType,
            cloudinary_url: mediaInput.cloudinaryUrl,
            file_name: mediaInput.fileName,
            description: mediaInput.description,
            order_index: mediaInput.orderIndex,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating chapter media:', error);
        throw new Error(`Failed to create chapter media: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createChapterMedia service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all media entries for a specific chapter.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} chapterId - The UUID of the chapter.
   * @returns {Promise<Array<object>>} An array of chapter media objects.
   * @throws {Error} If fetching chapter media fails.
   */
  getChapterMediaByChapter: async (supabase, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('chapter_media')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching chapter media by chapter ID:', error);
        throw new Error(`Failed to fetch chapter media: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getChapterMediaByChapter service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single chapter media entry by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the media entry.
   * @returns {Promise<object|null>} The chapter media object, or null if not found.
   * @throws {Error} If fetching the media entry fails.
   */
  getChapterMediaById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('chapter_media')
        .select('*')
        .eq('media_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching chapter media by ID:', error);
        throw new Error(`Failed to fetch chapter media: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getChapterMediaById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing chapter media entry in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the media entry to update.
   * @param {object} updates - An object containing the fields to update (mediaType, cloudinaryUrl, fileName, description, orderIndex).
   * @returns {Promise<object>} The updated chapter media object.
   * @throws {Error} If the media update fails.
   */
  updateChapterMedia: async (supabase, id, updates) => {
    try {
      const updateData = {};
      if (updates.mediaType !== undefined) updateData.media_type = updates.mediaType;
      if (updates.cloudinaryUrl !== undefined) updateData.cloudinary_url = updates.cloudinaryUrl;
      if (updates.fileName !== undefined) updateData.file_name = updates.fileName;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;

      const { data, error } = await supabase
        .from('chapter_media')
        .update(updateData)
        .eq('media_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating chapter media:', error);
        throw new Error(`Failed to update chapter media: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateChapterMedia service:', error);
      throw error;
    }
  },

  /**
   * Deletes a chapter media entry from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the media entry to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the media deletion fails.
   */
  deleteChapterMedia: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('chapter_media')
        .delete()
        .eq('media_id', id);

      if (error) {
        console.error('Error deleting chapter media:', error);
        throw new Error(`Failed to delete chapter media: ${error.message}`);
      }
      console.log(`Chapter Media ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteChapterMedia service:', error);
      throw error;
    }
  },
};

module.exports = chapterMediaService;
