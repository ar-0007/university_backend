const assignmentService = require('../services/assignmentService');
const getSupabaseClient = require('../utils/supabaseClient');
const { uploadDocument, uploadImage } = require('../utils/cloudinaryUploader');

const assignmentController = {
  // GET /api/assignments
  getAllAssignments: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { course_id, chapter_id } = req.query;
      
      const assignments = await assignmentService.getAllAssignments(supabase, {
        courseId: course_id,
        chapterId: chapter_id
      });
      
      res.status(200).json({
        success: true,
        data: assignments,
        message: 'Assignments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/assignments/upload
  createAssignmentWithUpload: async (req, res, next) => {
    try {
      const {
        title,
        description,
        course_id,
        chapter_id,
        max_score,
        due_date
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Assignment title is required'
          }
        });
      }

      // Validate that either course_id or chapter_id is provided
      if (!course_id && !chapter_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either course_id or chapter_id is required'
          }
        });
      }

      let assignmentFileUrl = null;

      // Handle assignment file upload
      if (req.file) {
        try {
          const fileBuffer = req.file.buffer;
          const isImage = req.file.mimetype.startsWith('image/');
          
          let uploadResult;
          if (isImage) {
            uploadResult = await uploadImage(fileBuffer, {
              folder: 'detailers-university/assignments',
              public_id: `assignment_${Date.now()}`,
              resource_type: 'image'
            });
          } else {
            uploadResult = await uploadDocument(fileBuffer, {
              folder: 'detailers-university/assignments',
              public_id: `assignment_${Date.now()}`,
              resource_type: 'raw'
            });
          }
          
          assignmentFileUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Assignment file upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload assignment file'
            }
          });
        }
      }

      const assignmentInput = {
        title,
        description,
        courseId: course_id,
        chapterId: chapter_id,
        assignmentFileUrl,
        maxScore: max_score ? parseFloat(max_score) : 100,
        dueDate: due_date
      };

      const supabase = getSupabaseClient();
      const assignment = await assignmentService.createAssignment(supabase, assignmentInput);
      
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Assignment created successfully'
      });
    } catch (error) {
      console.error('Assignment creation error:', error);
      next(error);
    }
  },

  // POST /api/assignments
  createAssignment: async (req, res, next) => {
    try {
      const {
        title,
        description,
        course_id,
        chapter_id,
        max_score,
        due_date,
        assignment_file_url,
        is_published
      } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Assignment title is required'
          }
        });
      }

      // Validate that either course_id or chapter_id is provided
      if (!course_id && !chapter_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either course_id or chapter_id is required'
          }
        });
      }

      const assignmentInput = {
        title,
        description,
        courseId: course_id,
        chapterId: chapter_id,
        assignmentFileUrl: assignment_file_url,
        maxScore: max_score ? parseFloat(max_score) : 100,
        dueDate: due_date,
        isPublished: is_published !== undefined ? is_published : true
      };

      const supabase = getSupabaseClient();
      const assignment = await assignmentService.createAssignment(supabase, assignmentInput);
      
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Assignment created successfully'
      });
    } catch (error) {
      console.error('Assignment creation error:', error);
      next(error);
    }
  },

  // GET /api/assignments/:id
  getAssignmentById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const assignment = await assignmentService.getAssignmentById(supabase, id);
       
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Assignment not found'
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/assignments/:id/upload
  updateAssignmentWithUpload: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Handle assignment file upload
      if (req.file) {
        try {
          const fileBuffer = req.file.buffer;
          const isImage = req.file.mimetype.startsWith('image/');
          
          let uploadResult;
          if (isImage) {
            uploadResult = await uploadImage(fileBuffer, {
              folder: 'detailers-university/assignments',
              public_id: `assignment_${id}_${Date.now()}`,
              resource_type: 'image'
            });
          } else {
            uploadResult = await uploadDocument(fileBuffer, {
              folder: 'detailers-university/assignments',
              public_id: `assignment_${id}_${Date.now()}`,
              resource_type: 'raw'
            });
          }
          
          updates.assignmentFileUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Assignment file upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: {
              code: 'UPLOAD_ERROR',
              message: 'Failed to upload assignment file'
            }
          });
        }
      }

      // Convert string values to appropriate types
      if (updates.max_score) updates.maxScore = parseFloat(updates.max_score);
      if (updates.due_date) updates.dueDate = updates.due_date;
      
      const supabase = getSupabaseClient();
      const assignment = await assignmentService.updateAssignment(supabase, id, updates);
      
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment updated successfully'
      });
    } catch (error) {
      console.error('Assignment update error:', error);
      next(error);
    }
  },

  // PUT /api/assignments/:id
  updateAssignment: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      
      // Convert string values to appropriate types
      if (updates.max_score) updates.maxScore = parseFloat(updates.max_score);
      if (updates.due_date) updates.dueDate = updates.due_date;
      if (updates.assignment_file_url) updates.assignmentFileUrl = updates.assignment_file_url;
      
      const supabase = getSupabaseClient();
      const assignment = await assignmentService.updateAssignment(supabase, id, updates);
      
      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment updated successfully'
      });
    } catch (error) {
      console.error('Assignment update error:', error);
      next(error);
    }
  },
  
  // DELETE /api/assignments/:id
  deleteAssignment: async (req, res, next) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      await assignmentService.deleteAssignment(supabase, id);
      
      res.status(200).json({
        success: true,
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = assignmentController;

