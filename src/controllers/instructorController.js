const { supabase } = require('../utils/supabaseClient');

const instructorController = {
  // Get all instructors
  getAllInstructors: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        message: 'Instructors retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching instructors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instructors',
        error: error.message
      });
    }
  },

  // Get instructor by ID
  getInstructorById: async (req, res) => {
    try {
      const { instructorId } = req.params;

      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('instructor_id', instructorId)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }

      res.json({
        success: true,
        data,
        message: 'Instructor retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching instructor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instructor',
        error: error.message
      });
    }
  },

  // Create new instructor
  createInstructor: async (req, res) => {
    try {
      const {
        user_id,
        first_name,
        last_name,
        email,
        bio,
        profile_image_url,
        specialties,
        experience_years,
        education,
        certifications,
        hourly_rate
      } = req.body;

      // Validate required fields
      if (!first_name || !last_name || !email) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, and email are required'
        });
      }

      const instructorData = {
        user_id,
        first_name,
        last_name,
        email,
        bio,
        profile_image_url,
        specialties: specialties || [],
        experience_years: experience_years || 0,
        education,
        certifications: certifications || [],
        hourly_rate: hourly_rate || 0,
        is_active: true
      };

      const { data, error } = await supabase
        .from('instructors')
        .insert([instructorData])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data,
        message: 'Instructor created successfully'
      });
    } catch (error) {
      console.error('Error creating instructor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create instructor',
        error: error.message
      });
    }
  },

  // Update instructor
  updateInstructor: async (req, res) => {
    try {
      const { instructorId } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated
      delete updateData.instructor_id;
      delete updateData.created_at;

      const { data, error } = await supabase
        .from('instructors')
        .update(updateData)
        .eq('instructor_id', instructorId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }

      res.json({
        success: true,
        data,
        message: 'Instructor updated successfully'
      });
    } catch (error) {
      console.error('Error updating instructor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update instructor',
        error: error.message
      });
    }
  },

  // Delete instructor (soft delete)
  deleteInstructor: async (req, res) => {
    try {
      const { instructorId } = req.params;

      const { data, error } = await supabase
        .from('instructors')
        .update({ is_active: false })
        .eq('instructor_id', instructorId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }

      res.json({
        success: true,
        message: 'Instructor deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting instructor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete instructor',
        error: error.message
      });
    }
  },

  // Get instructors by specialty
  getInstructorsBySpecialty: async (req, res) => {
    try {
      const { specialty } = req.params;

      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('is_active', true)
        .contains('specialties', [specialty])
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        message: 'Instructors retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching instructors by specialty:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instructors',
        error: error.message
      });
    }
  }
};

module.exports = instructorController; 