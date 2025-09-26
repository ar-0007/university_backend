// src/services/enrollmentService.js

const enrollmentService = {
  /**
   * Creates a new enrollment request in the database.
   * This is typically initiated by a student.
   * The status is set to 'pending' by default.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user requesting enrollment.
   * @param {string} courseId - The ID of the course to enroll in.
   * @returns {Promise<object>} The newly created enrollment object.
   * @throws {Error} If the enrollment creation fails (e.g., already enrolled).
   */
  createEnrollment: async (supabase, userId, courseId) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .insert([
          {
            user_id: userId,
            course_id: courseId,
            status: 'pending', // Default status on creation
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating enrollment:', error);
        throw new Error(`Failed to create enrollment: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createEnrollment service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all enrollment requests.
   * Can be filtered by status (e.g., 'pending').
   * Primarily for admin use.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} [status] - Optional. Filter by enrollment status ('pending', 'approved', 'rejected').
   * @returns {Promise<Array<object>>} An array of enrollment objects.
   * @throws {Error} If fetching enrollments fails.
   */
  getAllEnrollments: async (supabase, status = null) => {
    try {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          users ( user_id, email, first_name, last_name ),
          courses ( course_id, title )
        `);
  
      if (status) {
        query = query.eq('status', status);
      }
  
      // Change from 'enrolled_at' to 'requested_at' or 'created_at'
      const { data, error } = await query.order('requested_at', { ascending: true });
  
      if (error) {
        console.error('Error fetching all enrollments:', error);
        throw new Error(`Failed to fetch enrollments: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getAllEnrollments service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single enrollment by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} enrollmentId - The UUID of the enrollment.
   * @returns {Promise<object|null>} The enrollment object, or null if not found.
   * @throws {Error} If fetching the enrollment fails.
   */
  getEnrollmentById: async (supabase, enrollmentId) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          users ( user_id, email, first_name, last_name ),
          courses ( course_id, title )
        `)
        .eq('enrollment_id', enrollmentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching enrollment by ID:', error);
        throw new Error(`Failed to fetch enrollment: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getEnrollmentById service:', error);
      throw error;
    }
  },

  /**
   * Updates the status of an enrollment (e.g., 'approved', 'rejected').
   * Also sets the approved_at timestamp if the status is 'approved'.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} enrollmentId - The UUID of the enrollment to update.
   * @param {string} newStatus - The new status ('approved', 'rejected').
   * @returns {Promise<object>} The updated enrollment object.
   * @throws {Error} If the update fails.
   */
  updateEnrollmentStatus: async (supabase, enrollmentId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.approved_at = null; // Clear if status is changed from approved
      }

      const { data, error } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('enrollment_id', enrollmentId)
        .select(`
          *,
          users(user_id, email),
          courses(course_id, title)
        `)
        .single();

      if (error) {
        console.error('Error updating enrollment status:', error);
        throw new Error(`Failed to update enrollment status: ${error.message}`);
      }

      // If enrollment is approved, unlock all chapters for the user
      if (newStatus === 'approved' && data) {
        try {
          const userChapterAccessService = require('./userChapterAccessService');
          await userChapterAccessService.unlockAllChaptersForCourse(
            supabase,
            data.user_id,
            data.course_id
          );
          console.log(`✅ All chapters unlocked for user ${data.user_id} in course ${data.course_id} after enrollment approval`);
        } catch (chapterError) {
          console.error('Error unlocking chapters after enrollment approval:', chapterError);
          // Don't throw error here as enrollment update was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Error in updateEnrollmentStatus service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all courses a specific user is enrolled in and has 'approved' status.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The UUID of the user.
   * @returns {Promise<Array<object>>} An array of course objects the user is approved for.
   * @throws {Error} If fetching approved courses fails.
   */
  getApprovedCoursesForUser: async (supabase, userId) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses ( 
            course_id, 
            title, 
            description, 
            thumbnail_url, 
            is_published,
            price,
            level,
            duration_hours,
            instructor:instructor_id(
              instructor_id,
              first_name,
              last_name,
              email,
              bio,
              profile_image_url
            ),
            categories:category_id(
              name,
              slug,
              description
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved');
  
      if (error) {
        console.error('Error fetching approved courses for user:', error);
        throw new Error(`Failed to fetch user's approved courses: ${error.message}`);
      }
      // Extract the course objects from the nested structure
      return data.map(enrollment => enrollment.courses);
    } catch (error) {
      console.error('Error in getApprovedCoursesForUser service:', error);
      throw error;
    }
  },

  /**
   * Deletes an enrollment record.
   * Primarily for admin use (e.g., if a student cancels or is removed).
   * @param {object} supabase - The Supabase client instance.
   * @param {string} enrollmentId - The UUID of the enrollment to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the deletion fails.
   */
  deleteEnrollment: async (supabase, enrollmentId) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('enrollment_id', enrollmentId);

      if (error) {
        console.error('Error deleting enrollment:', error);
        throw new Error(`Failed to delete enrollment: ${error.message}`);
      }
      console.log(`Enrollment ${enrollmentId} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteEnrollment service:', error);
      throw error;
    }
  },
};

module.exports = enrollmentService;
