// src/middleware/restAuthMiddleware.js
const jwt = require('jsonwebtoken');
const getSupabaseClient = require('../utils/supabaseClient');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Fetch user details from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_USER',
          message: 'User not found or inactive'
        }
      });
    }

    // Attach user and supabase to request
    req.user = user;
    req.supabase = supabase;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }

    next(error);
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      req.supabase = getSupabaseClient();
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Fetch user details from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('is_active', true)
      .single();

    req.user = error || !user ? null : user;
    req.supabase = supabase;
    next();
  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    req.supabase = getSupabaseClient();
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};

