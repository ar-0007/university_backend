require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

// Placeholder routes
const courseRoutes = require('./src/routes/courseRoutes');
const chapterRoutes = require('./src/routes/chapterRoutes');
const mediaRoutes = require('./src/routes/mediaRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const videoProgressRoutes = require('./src/routes/videoProgressRoutes');
const mentorshipRoutes = require('./src/routes/mentorshipRoutes');
const publicMentorshipRoutes = require('./src/routes/publicMentorshipRoutes');
const guestBookingRoutes = require('./src/routes/guestBookingRoutes');
const guestCoursePurchaseRoutes = require('./src/routes/guestCoursePurchaseRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const instructorRoutes = require('./src/routes/instructorRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const adminSeriesUnlockRoutes = require('./src/routes/admin/seriesUnlock');

const app = express();
const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.JWT_SECRET) {
    console.error('Missing required environment variables');
    process.exit(1);
  }
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    console.error('Missing Square configuration');
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Detailers University REST API',
      version: '1.0.0',
      description: 'A comprehensive REST API for Detailers University platform with authentication, user management, file uploads, and payment processing.',
      contact: {
        name: 'API Support',
        email: 'support@detailersuniversity.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}` 
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Detailers University REST API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Detailers University API Documentation'
}));

 

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);

// Placeholder routes (to be implemented)
app.use('/api/courses', courseRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/video-progress', videoProgressRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/public/mentorship', publicMentorshipRoutes);
app.use('/api/guest-bookings', guestBookingRoutes);
app.use('/api/guest-course-purchases', guestCoursePurchaseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/series-unlock', adminSeriesUnlockRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.originalUrl
    }
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Detailers University REST API server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown handling for Railway deployment
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;


