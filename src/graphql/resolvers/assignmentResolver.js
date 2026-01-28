// src/graphql/resolvers/assignmentResolver.js
const assignmentService = require('../../services/assignmentService');
const courseService = require('../../services/courseService'); // For nested Course data
const chapterService = require('../../services/chapterService'); // For nested Chapter data

const assignmentResolvers = {
  Query: {
    /**
     * Retrieves all assignments, optionally filtered by course or chapter.
     * Accessible by administrators or students (who are enrolled in relevant courses).
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing optional filters (courseId, chapterId).
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of assignment objects.
     */
    assignments: async (parent, { courseId, chapterId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view assignments.');
      }
      // TODO: Add more granular authorization here.
      // E.g., students can only see assignments for courses they are enrolled in.
      // For now, if authenticated, they can query. Admin can see all.
      return assignmentService.getAllAssignments(context.supabase, courseId, chapterId);
    },

    /**
     * Retrieves a single assignment by its ID.
     * Accessible by administrators or students (who are enrolled in the relevant course).
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the assignment ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The assignment object, or null if not found.
     */
    assignment: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view assignment details.');
      }
      const assignment = await assignmentService.getAssignmentById(context.supabase, id);

      if (!assignment) {
        return null;
      }

      // TODO: Add authorization check:
      // If student, ensure they are enrolled in the course associated with the assignment (if any).
      // For now, if authenticated, they can access.

      return assignment;
    },
  },

  Mutation: {
    /**
     * Creates a new assignment.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the assignment input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created assignment object.
     */
    createAssignment: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create assignments.');
      }
      return assignmentService.createAssignment(context.supabase, input);
    },

    /**
     * Updates an existing assignment.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the assignment ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated assignment object.
     */
    updateAssignment: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update assignments.');
      }
      return assignmentService.updateAssignment(context.supabase, id, input);
    },

    /**
     * Deletes an assignment.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the assignment ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteAssignment: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete assignments.');
      }
      await assignmentService.deleteAssignment(context.supabase, id);
      return `Assignment with ID ${id} deleted successfully.`;
    },
  },

  // Resolvers for nested fields within the 'Assignment' type
  Assignment: {
    course: async (parent, args, context) => {
      // 'parent' here is the Assignment object, which contains course_id
      if (!parent.course_id) return null;
      return courseService.getCourseById(context.supabase, parent.course_id);
    },
    chapter: async (parent, args, context) => {
      // 'parent' here is the Assignment object, which contains chapter_id
      if (!parent.chapter_id) return null;
      return chapterService.getChapterById(context.supabase, parent.chapter_id);
    },
    submissions: async (parent, args, context) => {
      // 'parent' here is the Assignment object, which contains assignment_id
      return assignmentService.getSubmissionsByAssignment(context.supabase, parent.assignment_id);
    },
  },
};

module.exports = assignmentResolvers;
