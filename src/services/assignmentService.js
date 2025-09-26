// src/services/assignmentService.js

const assignmentService = {
  /**
   * Creates a new assignment in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} assignmentInput - The input data for the new assignment.
   * @returns {Promise<object>} The newly created assignment object.
   * @throws {Error} If the assignment creation fails.
   */
  createAssignment: async (supabase, assignmentInput) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([
          {
            title: assignmentInput.title,
            description: assignmentInput.description,
            course_id: assignmentInput.courseId,
            chapter_id: assignmentInput.chapterId,
            assignment_file_url: assignmentInput.assignmentFileUrl,
            max_score: assignmentInput.maxScore || 100,
            due_date: assignmentInput.dueDate,
            is_published: assignmentInput.isPublished !== undefined ? assignmentInput.isPublished : true
          },
        ])
        .select(`
          *,
          courses:course_id(title),
          chapters:chapter_id(title)
        `)
        .single();
  
      if (error) {
        console.error('Error creating assignment:', error);
        throw new Error(`Failed to create assignment: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createAssignment service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all assignments from the database.
   * Can filter by course or chapter.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} filters - Optional filters for courseId and chapterId.
   * @returns {Promise<Array<object>>} An array of assignment objects.
   * @throws {Error} If fetching assignments fails.
   */
  getAllAssignments: async (supabase, filters = {}) => {
    try {
      let query = supabase
        .from('assignments')
        .select(`
          *,
          courses:course_id(title, description),
          chapters:chapter_id(title, description)
        `);

      if (filters.courseId) {
        query = query.eq('course_id', filters.courseId);
      }

      if (filters.chapterId) {
        query = query.eq('chapter_id', filters.chapterId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all assignments:', error);
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getAllAssignments service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single assignment by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the assignment.
   * @returns {Promise<object|null>} The assignment object, or null if not found.
   * @throws {Error} If fetching the assignment fails.
   */
  getAssignmentById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses:course_id(title, description),
          chapters:chapter_id(title, description)
        `)
        .eq('assignment_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching assignment by ID:', error);
        throw new Error(`Failed to fetch assignment: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getAssignmentById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing assignment in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the assignment to update.
   * @param {object} updates - An object containing the fields to update.
   * @returns {Promise<object>} The updated assignment object.
   * @throws {Error} If the assignment update fails.
   */
  updateAssignment: async (supabase, id, updates) => {
    try {
      const updateData = {};
      
      // Map frontend field names to database column names
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.assignmentFileUrl !== undefined) updateData.assignment_file_url = updates.assignmentFileUrl;
      if (updates.maxScore !== undefined) updateData.max_score = updates.maxScore;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;

      const { data, error } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('assignment_id', id)
        .select(`
          *,
          courses:course_id(title, description),
          chapters:chapter_id(title, description)
        `)
        .single();

      if (error) {
        console.error('Error updating assignment:', error);
        throw new Error(`Failed to update assignment: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateAssignment service:', error);
      throw error;
    }
  },

  /**
   * Deletes an assignment from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the assignment to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the assignment deletion fails.
   */
  deleteAssignment: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('assignment_id', id);

      if (error) {
        console.error('Error deleting assignment:', error);
        throw new Error(`Failed to delete assignment: ${error.message}`);
      }
      console.log(`Assignment ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteAssignment service:', error);
      throw error;
    }
  },

  /**
   * Gets assignments by course ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} courseId - The UUID of the course.
   * @returns {Promise<Array<object>>} An array of assignment objects.
   * @throws {Error} If fetching assignments fails.
   */
  getAssignmentsByCourse: async (supabase, courseId) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses:course_id(title, description)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments by course:', error);
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getAssignmentsByCourse service:', error);
      throw error;
    }
  },

  /**
   * Gets assignments by chapter ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} chapterId - The UUID of the chapter.
   * @returns {Promise<Array<object>>} An array of assignment objects.
   * @throws {Error} If fetching assignments fails.
   */
  getAssignmentsByChapter: async (supabase, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          chapters:chapter_id(title, description),
          courses:chapters(course_id(title))
        `)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments by chapter:', error);
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getAssignmentsByChapter service:', error);
      throw error;
    }
  }
};

module.exports = assignmentService;

