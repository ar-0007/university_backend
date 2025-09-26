// src/services/podcastService.js

const podcastService = {
  /**
   * Creates a new podcast in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} podcastInput - The input data for the new podcast.
   * @returns {Promise<object>} The newly created podcast object.
   * @throws {Error} If the podcast creation fails.
   */
  createPodcast: async (supabase, podcastInput) => {
    try {
      console.log('🔧 Podcast service input:', podcastInput);
      
      // Determine status and published_at based on scheduling
      let finalStatus = podcastInput.status || 'draft';
      let publishedAt = null;
      let scheduledAt = null;

      if (podcastInput.scheduledAt) {
        console.log('🔧 Processing scheduled_at:', podcastInput.scheduledAt);
        
        // Ensure the date string is properly formatted
        let dateString = podcastInput.scheduledAt;
        if (dateString && !dateString.includes('T')) {
          // If it's just a date, add time
          dateString = `${dateString}T00:00:00`;
        } else if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
          // If it's missing seconds, add them
          dateString = `${dateString}:00`;
        }
        
        const scheduledDate = new Date(dateString);
        const now = new Date();
        
        console.log('🔧 Parsed scheduled date:', scheduledDate);
        console.log('🔧 Current date:', now);
        console.log('🔧 Is future date:', scheduledDate > now);
        
        if (scheduledDate > now) {
          finalStatus = 'scheduled';
          scheduledAt = scheduledDate.toISOString();
        } else {
          finalStatus = 'published';
          publishedAt = scheduledDate.toISOString();
        }
      } else if (finalStatus === 'published') {
        publishedAt = new Date().toISOString();
      }

      const insertData = {
        title: podcastInput.title,
        description: podcastInput.description,
        video_url: podcastInput.videoUrl,
        thumbnail_url: podcastInput.thumbnailUrl,
        duration: podcastInput.duration,
        status: finalStatus,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
      };
      
      console.log('🔧 Final insert data:', insertData);
      
      const { data, error } = await supabase
        .from('podcasts')
        .insert([insertData])
        .select()
        .single();
  
      if (error) {
        console.error('❌ Error creating podcast:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to create podcast: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createPodcast service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all podcasts from the database.
   * Can filter by status.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} [status] - Optional status filter.
   * @returns {Promise<Array<object>>} An array of podcast objects.
   * @throws {Error} If fetching podcasts fails.
   */
  getAllPodcasts: async (supabase, status = null) => {
    try {
      let query = supabase
        .from('podcasts')
        .select(`
          *,
          likes_count:podcast_likes(count)
        `);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all podcasts:', error);
        throw new Error(`Failed to fetch podcasts: ${error.message}`);
      }

      // Transform the likes_count from array to number
      const transformedData = data.map(podcast => ({
        ...podcast,
        likes_count: podcast.likes_count?.[0]?.count || 0
      }));

      return transformedData;
    } catch (error) {
      console.error('Error in getAllPodcasts service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single podcast by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the podcast.
   * @returns {Promise<object|null>} The podcast object, or null if not found.
   * @throws {Error} If fetching the podcast fails.
   */
  getPodcastById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          likes_count:podcast_likes(count)
        `)
        .eq('podcast_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching podcast by ID:', error);
        throw new Error(`Failed to fetch podcast: ${error.message}`);
      }

      // Transform the likes_count from array to number if data exists
      if (data) {
        data.likes_count = data.likes_count?.[0]?.count || 0;
      }

      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getPodcastById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing podcast in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the podcast to update.
   * @param {object} updates - An object containing the fields to update.
   * @returns {Promise<object>} The updated podcast object.
   * @throws {Error} If the podcast update fails.
   */
  updatePodcast: async (supabase, id, updates) => {
    try {
      const updateData = {};
      
      // Map frontend field names to database column names
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.videoUrl !== undefined) updateData.video_url = updates.videoUrl;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        // Set published_at when status changes to published
        if (updates.status === 'published') {
          updateData.published_at = new Date().toISOString();
          updateData.scheduled_at = null; // Clear scheduled_at when published
        } else if (updates.status === 'draft') {
          updateData.published_at = null;
          updateData.scheduled_at = null; // Clear scheduled_at when draft
        }
      }
      
      // Handle scheduling
      if (updates.scheduledAt !== undefined) {
        if (updates.scheduledAt) {
          const scheduledDate = new Date(updates.scheduledAt);
          const now = new Date();
          
          if (scheduledDate > now) {
            updateData.status = 'scheduled';
            updateData.scheduled_at = scheduledDate.toISOString();
            updateData.published_at = null;
          } else {
            updateData.status = 'published';
            updateData.published_at = scheduledDate.toISOString();
            updateData.scheduled_at = null;
          }
        } else {
          updateData.scheduled_at = null;
        }
      }

      const { data, error } = await supabase
        .from('podcasts')
        .update(updateData)
        .eq('podcast_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating podcast:', error);
        throw new Error(`Failed to update podcast: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updatePodcast service:', error);
      throw error;
    }
  },

  /**
   * Deletes a podcast from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the podcast to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the podcast deletion fails.
   */
  deletePodcast: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('podcasts')
        .delete()
        .eq('podcast_id', id);

      if (error) {
        console.error('Error deleting podcast:', error);
        throw new Error(`Failed to delete podcast: ${error.message}`);
      }
      console.log(`Podcast ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deletePodcast service:', error);
      throw error;
    }
  },

  /**
   * Publishes a podcast by updating its status to 'published'.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the podcast to publish.
   * @returns {Promise<object>} The updated podcast object.
   * @throws {Error} If the podcast publishing fails.
   */
  publishPodcast: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('podcast_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error publishing podcast:', error);
        throw new Error(`Failed to publish podcast: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in publishPodcast service:', error);
      throw error;
    }
  },

  /**
   * Archives a podcast by updating its status to 'archived'.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the podcast to archive.
   * @returns {Promise<object>} The updated podcast object.
   * @throws {Error} If the podcast archiving fails.
   */
  archivePodcast: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .update({
          status: 'archived'
        })
        .eq('podcast_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error archiving podcast:', error);
        throw new Error(`Failed to archive podcast: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in archivePodcast service:', error);
      throw error;
    }
  },

  /**
   * Gets published podcasts only.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of published podcast objects.
   * @throws {Error} If fetching podcasts fails.
   */
  getPublishedPodcasts: async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          likes_count:podcast_likes(count)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching published podcasts:', error);
        throw new Error(`Failed to fetch published podcasts: ${error.message}`);
      }

      // Transform the likes_count from array to number
      const transformedData = data.map(podcast => ({
        ...podcast,
        likes_count: podcast.likes_count?.[0]?.count || 0
      }));

      return transformedData;
    } catch (error) {
      console.error('Error in getPublishedPodcasts service:', error);
      throw error;
    }
  },

  /**
   * Gets draft podcasts only.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of draft podcast objects.
   * @throws {Error} If fetching podcasts fails.
   */
  getDraftPodcasts: async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          likes_count:podcast_likes(count)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching draft podcasts:', error);
        throw new Error(`Failed to fetch draft podcasts: ${error.message}`);
      }

      // Transform the likes_count from array to number
      const transformedData = data.map(podcast => ({
        ...podcast,
        likes_count: podcast.likes_count?.[0]?.count || 0
      }));

      return transformedData;
    } catch (error) {
      console.error('Error in getDraftPodcasts service:', error);
      throw error;
    }
  },

  /**
   * Likes a podcast for a user.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} podcastId - The ID of the podcast to like.
   * @param {string} userId - The ID of the user liking the podcast.
   * @throws {Error} If liking the podcast fails.
   */
  likePodcast: async (supabase, podcastId, userId) => {
    try {
      // Check if podcast exists
      const { data: podcast, error: podcastError } = await supabase
        .from('podcasts')
        .select('podcast_id')
        .eq('podcast_id', podcastId)
        .single();

      if (podcastError || !podcast) {
        throw new Error('Podcast not found');
      }

      // Insert or update like record
      const { error } = await supabase
        .from('podcast_likes')
        .upsert({
          podcast_id: podcastId,
          user_id: userId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'podcast_id,user_id'
        });

      if (error) {
        console.error('Error liking podcast:', error);
        throw new Error(`Failed to like podcast: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in likePodcast service:', error);
      throw error;
    }
  },

  /**
   * Unlikes a podcast for a user.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} podcastId - The ID of the podcast to unlike.
   * @param {string} userId - The ID of the user unliking the podcast.
   * @throws {Error} If unliking the podcast fails.
   */
  unlikePodcast: async (supabase, podcastId, userId) => {
    try {
      const { error } = await supabase
        .from('podcast_likes')
        .delete()
        .eq('podcast_id', podcastId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error unliking podcast:', error);
        throw new Error(`Failed to unlike podcast: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in unlikePodcast service:', error);
      throw error;
    }
  },

  /**
   * Gets all podcasts liked by a user.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<Array<string>>} An array of liked podcast IDs.
   * @throws {Error} If fetching liked podcasts fails.
   */
  getLikedPodcasts: async (supabase, userId) => {
    try {
      const { data, error } = await supabase
        .from('podcast_likes')
        .select('podcast_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching liked podcasts:', error);
        throw new Error(`Failed to fetch liked podcasts: ${error.message}`);
      }

      return data.map(like => like.podcast_id);
    } catch (error) {
      console.error('Error in getLikedPodcasts service:', error);
      throw error;
    }
  }
};

module.exports = podcastService;

