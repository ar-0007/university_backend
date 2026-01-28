const enrollmentService = require('../services/enrollmentService');
const getSupabaseClient = require('../utils/supabaseClient');

const enrollmentController = {
  // GET /api/enrollments
  getAllEnrollments: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { status } = req.query;
      const enrollments = await enrollmentService.getAllEnrollments(supabase, status);
      
      res.status(200).json({
        success: true,
        data: enrollments,
        message: 'Enrollments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/enrollments
  createEnrollment: async (req, res, next) => {
    try {
      const { user_id, course_id } = req.body;
      
      if (!user_id || !course_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID and Course ID are required'
          }
        });
      }

      const supabase = getSupabaseClient();
      
      // Check if user is blocked
      const { data: user } = await supabase
        .from('users')
        .select('is_active')
        .eq('user_id', user_id)
        .single();

      if (user && !user.is_active) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'USER_BLOCKED',
            message: 'Your account has been blocked. Please contact support.'
          }
        });
      }
      
      const enrollment = await enrollmentService.createEnrollment(supabase, user_id, course_id);
      
      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Enrollment created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/enrollments/:id
  getEnrollmentById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const enrollment = await enrollmentService.getEnrollmentById(supabase, id);
      
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ENROLLMENT_NOT_FOUND',
            message: 'Enrollment not found'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: enrollment,
        message: 'Enrollment retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/enrollments/user/:userId/courses
  getApprovedCoursesForUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const supabase = getSupabaseClient();
      const courses = await enrollmentService.getApprovedCoursesForUser(supabase, userId);
      
      res.status(200).json({
        success: true,
        data: courses,
        message: 'User approved courses retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/enrollments/:id/status
  updateEnrollmentStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;
      const supabase = getSupabaseClient();
      
      const enrollment = await enrollmentService.updateEnrollmentStatus(
        supabase, 
        id, 
        status, 
        rejection_reason
      );
      
      res.status(200).json({
        success: true,
        data: enrollment,
        message: 'Enrollment status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/enrollments/my-courses
  getMyApprovedCourses: async (req, res, next) => {
    try {
      const userId = req.user.user_id; // Get from authenticated user
      const supabase = getSupabaseClient();
      const courses = await enrollmentService.getApprovedCoursesForUser(supabase, userId);
      
      res.status(200).json({
        success: true,
        data: courses,
        message: 'User approved courses retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/enrollments/:id
  deleteEnrollment: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      await enrollmentService.deleteEnrollment(supabase, id);
      
      res.status(200).json({
        success: true,
        message: 'Enrollment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = enrollmentController;