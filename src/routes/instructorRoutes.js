const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');
const { authenticateToken, requireRole } = require('../middleware/restAuthMiddleware');

// Public routes
router.get('/', instructorController.getAllInstructors);
router.get('/:instructorId', instructorController.getInstructorById);
router.get('/specialty/:specialty', instructorController.getInstructorsBySpecialty);

// Protected routes (admin only)
router.post('/', authenticateToken, requireRole('ADMIN'), instructorController.createInstructor);
router.put('/:instructorId', authenticateToken, requireRole('ADMIN'), instructorController.updateInstructor);
router.delete('/:instructorId', authenticateToken, requireRole('ADMIN'), instructorController.deleteInstructor);

module.exports = router; 