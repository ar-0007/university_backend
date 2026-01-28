// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.error.code = 'VALIDATION_ERROR';
    error.error.message = 'Validation failed';
    error.error.details = err.errors;
    return res.status(400).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.error.code = 'INVALID_TOKEN';
    error.error.message = 'Invalid authentication token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.error.code = 'TOKEN_EXPIRED';
    error.error.message = 'Authentication token has expired';
    return res.status(401).json(error);
  }

  // Custom application errors
  if (err.statusCode) {
    error.error.code = err.code || 'APPLICATION_ERROR';
    error.error.message = err.message;
    return res.status(err.statusCode).json(error);
  }

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    error.error.code = 'DUPLICATE_ENTRY';
    error.error.message = 'Resource already exists';
    return res.status(409).json(error);
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    error.error.code = 'FOREIGN_KEY_VIOLATION';
    error.error.message = 'Referenced resource does not exist';
    return res.status(400).json(error);
  }

  // Default 500 error
  res.status(500).json(error);
};

module.exports = errorHandler;

