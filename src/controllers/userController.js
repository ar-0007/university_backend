// src/controllers/userController.js
const userService = require('../services/userService');
const authService = require('../services/authService');

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
      
      res.status(200).json({
        success: true,
        data: user,
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
      if (req.user.role !== 'admin' && req.user.user_id !== id) {
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
      const { email, firstName, lastName, role } = req.body;

      const newUser = await authService.createUserAndSendCredentials(
        req.supabase,
        email,
        firstName,
        lastName,
        role
      );

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully'
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

      // Remove sensitive fields from response
      delete updatedUser.password_hash;
      delete updatedUser.salt;

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

      // Prevent admin from deleting themselves
      if (req.user.user_id === id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Cannot delete your own account'
          }
        });
      }

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

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'isActive must be a boolean value'
          }
        });
      }

      // Prevent admin from deactivating themselves
      if (req.user.user_id === id && !isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Cannot deactivate your own account'
          }
        });
      }

      const { data: updatedUser, error } = await req.supabase
        .from('users')
        .update({
          is_active: isActive,
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

      // Remove sensitive fields from response
      delete updatedUser.password_hash;
      delete updatedUser.salt;

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;

