// src/controllers/userController.js
const userService = require('../services/userService');
const authService = require('../services/authService');
const courseService = require('../services/courseService');
const enrollmentService = require('../services/enrollmentService');

const userController = {
  // GET /api/users
  getAllUsers: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, role } = req.query;
      const offset = (page - 1) * limit;

      let query = req.supabase
        .from('users')
        .select('user_id, email, first_name, last_name, role, is_active, created_at, updated_at', { count: 'exact' });

      if (role) {
        query = query.eq('role', role);
      }

      const { data: users, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages
        },
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/users/me
  getCurrentUser: async (req, res, next) => {
    try {
      const user = await userService.getUserById(req.supabase, req.user.user_id);
      
      // Fetch approved courses for the authenticated user so the app can display them
      let approvedCourses = await enrollmentService.getApprovedCoursesForUser(
        req.supabase,
        req.user.user_id
      );

      // Ensure the user has approved enrollments for all published courses
      try {
        const courses = await courseService.getAllCourses(req.supabase, true);
        const approvedCourseIds = new Set(approvedCourses.map(c => c.course_id));

        for (const course of courses) {
          if (!approvedCourseIds.has(course.course_id)) {
            // Check existing enrollment
            const { data: existing, error: existingError } = await req.supabase
              .from('enrollments')
              .select('enrollment_id, status')
              .eq('user_id', req.user.user_id)
              .eq('course_id', course.course_id);

            if (existingError) throw existingError;

            let enrollmentId = null;
            let status = null;

            if (Array.isArray(existing) && existing.length > 0) {
              enrollmentId = existing[0].enrollment_id;
              status = existing[0].status;
            } else {
              // Create enrollment if missing with valid status/payment_status per DB constraints
              const { data: created, error: createError } = await req.supabase
                .from('enrollments')
                .insert({
                  user_id: req.user.user_id,
                  course_id: course.course_id,
                  status: 'PENDING',
                  payment_status: 'pending',
                  requested_at: new Date().toISOString()
                })
                .select('enrollment_id, status')
                .single();

              if (createError) throw createError;

              enrollmentId = created.enrollment_id;
              status = created.status;
            }

            // Approve to unlock chapters (use correct casing)
            if (status !== 'APPROVED') {
              const { error: updateError } = await req.supabase
                .from('enrollments')
                .update({
                  status: 'APPROVED',
                  approved_at: new Date().toISOString()
                })
                .eq('enrollment_id', enrollmentId);

              if (updateError) throw updateError;
            }
          }
        }

        // Refresh approved courses after ensuring access (use uppercase status)
        const { data: approvedEnrollments, error: approvedError } = await req.supabase
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
          .eq('user_id', req.user.user_id)
          .eq('status', 'APPROVED');

        if (approvedError) throw approvedError;

        approvedCourses = (approvedEnrollments || []).map(e => e.courses);
      } catch (ensureError) {
        console.error('Error ensuring approved enrollments for user in getCurrentUser:', ensureError);
      }
      
      res.status(200).json({
        success: true,
        data: { 
          ...user,
          approvedCourses
        },
        message: 'Current user retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/users/:id
  getUserById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin or requesting their own data
      if (req.user.role !== 'ADMIN' && req.user.user_id !== id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      const user = await userService.getUserById(req.supabase, id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: user,
        message: 'User retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/users
  createUser: async (req, res, next) => {
    try {
      const { email, firstName, lastName } = req.body;
      // Force role to STUDENT for all admin-panel created users
      const role = 'STUDENT';

      // 1) Create user and send credentials
      const newUser = await authService.createUserAndSendCredentials(
        req.supabase,
        email,
        firstName,
        lastName,
        role
      );

      // 2) Fetch all published courses
      const courses = await courseService.getAllCourses(req.supabase, true);

      let grantedCount = 0;
      let alreadyApprovedCount = 0;
      const errors = [];

      // 3) Ensure approved enrollment for each course
      for (const course of courses) {
        try {
          // Check existing enrollment
          const { data: existing, error: existingError } = await req.supabase
            .from('enrollments')
            .select('enrollment_id, status')
            .eq('user_id', newUser.id)
            .eq('course_id', course.course_id);

          if (existingError) throw existingError;

          let enrollmentId = null;
          let status = null;

          if (Array.isArray(existing) && existing.length > 0) {
            enrollmentId = existing[0].enrollment_id;
            status = existing[0].status;
          }

          // Create enrollment if missing with valid status/payment_status per DB constraints
          if (!enrollmentId) {
            const { data: created, error: createError } = await req.supabase
              .from('enrollments')
              .insert({
                user_id: newUser.id,
                course_id: course.course_id,
                status: 'PENDING',
                payment_status: 'pending',
                requested_at: new Date().toISOString()
              })
              .select('enrollment_id, status')
              .single();

            if (createError) throw createError;

            enrollmentId = created.enrollment_id;
            status = created.status;
          }

          // Approve to unlock chapters (use correct casing)
          if (status !== 'APPROVED') {
            const { error: updateError } = await req.supabase
              .from('enrollments')
              .update({
                status: 'APPROVED',
                approved_at: new Date().toISOString()
              })
              .eq('enrollment_id', enrollmentId);

            if (updateError) throw updateError;

            grantedCount++;
          } else {
            alreadyApprovedCount++;
          }
        } catch (e) {
          errors.push({ courseId: course.course_id, message: e.message });
        }
      }

      // 4) Respond with grant summary
      res.status(201).json({
        success: true,
        data: {
          user: newUser,
          grantSummary: {
            totalCourses: courses.length,
            grantedCount,
            alreadyApprovedCount,
            failedCount: errors.length,
            errors,
          },
        },
        message: 'User created successfully and granted access to all published courses'
      });
    } catch (error) {
      next(error);
    }
  },


  // PUT /api/users/me
  updateCurrentUser: async (req, res, next) => {
    try {
      const { firstName, lastName } = req.body;
      
      const updatedUser = await userService.updateUserProfile(
        req.supabase,
        req.user.user_id,
        { firstName, lastName }
      );

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/users/:id
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.password_hash;
      delete updateData.salt;
      delete updateData.user_id;

      const { data: updatedUser, error } = await req.supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', id)
        .select()
        .single();

      if (error) throw error;

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/users/:id
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { error } = await req.supabase
        .from('users')
        .delete()
        .eq('user_id', id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/users/:id/status
  updateUserStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const { data: updatedUser, error } = await req.supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('user_id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;

