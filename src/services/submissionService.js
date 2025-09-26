const { createClient } = require('@supabase/supabase-js');

class SubmissionService {
  /**
   * Get submissions by user and assignment
   * @param {Object} supabase - Supabase client
   * @param {string} userId - User ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Array>} Array of submissions
   */
  async getSubmissionsByUserAndAssignment(supabase, userId, assignmentId) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          feedback,
          grade,
          submitted_at,
          graded_at,
          created_at,
          updated_at,
          assignments (
            assignment_id,
            title,
            description,
            max_score
          )
        `)
        .eq('user_id', userId)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSubmissionsByUserAndAssignment:', error);
      throw error;
    }
  }

  /**
   * Create a new submission
   * @param {Object} supabase - Supabase client
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} Created submission
   */
  async createSubmission(supabase, submissionData) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: submissionData.assignment_id,
          user_id: submissionData.user_id,
          submission_text: submissionData.submission_text,
          cloudinary_url: submissionData.cloudinary_url,
          submitted_at: new Date().toISOString()
        })
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          feedback,
          grade,
          submitted_at,
          graded_at,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error creating submission:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createSubmission:', error);
      throw error;
    }
  }

  /**
   * Get submission by ID
   * @param {Object} supabase - Supabase client
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object|null>} Submission data or null
   */
  async getSubmissionById(supabase, submissionId) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          grade,
          feedback,
          submitted_at,
          graded_at,
          created_at,
          updated_at,
          assignments (
            assignment_id,
            title,
            description,
            max_score
          )
        `)
        .eq('submission_id', submissionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Error fetching submission:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getSubmissionById:', error);
      throw error;
    }
  }

  /**
   * Update submission score and feedback
   * @param {Object} supabase - Supabase client
   * @param {string} submissionId - Submission ID
   * @param {number} score - Score
   * @param {string} feedback - Feedback
   * @returns {Promise<Object>} Updated submission
   */
  async gradeSubmission(supabase, submissionId, score, feedback) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          grade: score,
          feedback,
          graded_at: new Date().toISOString()
        })
        .eq('submission_id', submissionId)
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          grade,
          feedback,
          submitted_at,
          graded_at,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error grading submission:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in gradeSubmission:', error);
      throw error;
    }
  }

  /**
   * Get all submissions for an assignment (admin only)
   * @param {Object} supabase - Supabase client
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Array>} Array of submissions
   */
  async getSubmissionsByAssignment(supabase, assignmentId) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          grade,
          feedback,
          submitted_at,
          graded_at,
          created_at,
          updated_at,
          users (
            user_id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions by assignment:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSubmissionsByAssignment:', error);
      throw error;
    }
  }

  async getAllSubmissions(supabase) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          submission_id,
          assignment_id,
          user_id,
          submission_text,
          cloudinary_url,
          grade,
          feedback,
          submitted_at,
          graded_at,
          created_at,
          updated_at,
          users (
            user_id,
            first_name,
            last_name,
            email
          ),
          assignments (
            assignment_id,
            title,
            description,
            max_score
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all submissions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSubmissions:', error);
      throw error;
    }
  }
}

module.exports = new SubmissionService();