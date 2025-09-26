// src/controllers/authController.js
const authService = require('../services/authService');
const getSupabaseClient = require('../utils/supabaseClient');

const authController = {
  // POST /api/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          }
        });
      }

      const supabase = getSupabaseClient();
      const { user, token } = await authService.loginUser(supabase, email, password);

      res.status(200).json({
        success: true,
        data: {
          user,
          token
        },
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/change-password
  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Old password and new password are required'
          }
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be at least 6 characters long'
          }
        });
      }

      await authService.changeUserPassword(req.supabase, req.user.user_id, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/refresh
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required'
          }
        });
      }

      // Implement refresh token logic here
      // For now, return an error as refresh tokens aren't implemented
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Refresh token functionality not implemented yet'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/logout
  logout: async (req, res, next) => {
    try {
      // In a stateless JWT system, logout is typically handled client-side
      // by removing the token. However, we can implement token blacklisting
      // if needed in the future.
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;

