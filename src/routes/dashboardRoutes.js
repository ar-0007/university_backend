const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/restAuthMiddleware');

// Dashboard stats endpoint
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

// Recent enrollments endpoint
router.get('/recent-enrollments', authenticateToken, dashboardController.getRecentEnrollments);

// Upcoming mentorship sessions endpoint
router.get('/upcoming-mentorship', authenticateToken, dashboardController.getUpcomingMentorshipSessions);

// Revenue overview endpoint
router.get('/revenue-overview', authenticateToken, dashboardController.getRevenueOverview);

module.exports = router;