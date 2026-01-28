// src/graphql/resolvers/submissionResolver.js
const assignmentService = require('../../services/assignmentService'); // This service handles submission logic
const userService = require('../../services/userService'); // For nested User data

const submissionResolvers = {
  Query: {
    /**
     * Retrieves all submissions for a specific assignment.
     * Accessible by administrators.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing the assignmentId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of submission objects.
     */
    submissionsByAssignment: async (parent, { assignmentId }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can view all submissions for an assignment.');
      }
      return assignmentService.getSubmissionsByAssignment(context.supabase, assignmentId);
    },

    /**
     * Retrieves a single submission by its ID.
     * Accessible by administrators or the user who made the submission.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the submission ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The submission object, or null if not found.
     */
    submission: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view submission details.');
      }

      const submission = await assignmentService.getSubmissionById(context.supabase, id);

      if (!submission) {
        return null;
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== submission.user_id) {
        throw new Error('Unauthorized: You can only view your own submissions.');
      }

      return submission;
    },

    /**
     * Retrieves all submissions made by a specific user.
     * Accessible by administrators or the user themselves.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the userId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<Array<object>>} An array of submission objects.
     */
    submissionsByUser: async (parent, { userId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view submissions.');
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== userId) {
        throw new Error('Unauthorized: You can only view your own submissions.');
      }

      return assignmentService.getSubmissionsByUser(context.supabase, userId);
    },
  },

  Mutation: {
    /**
     * Creates a new submission for an assignment.
     * Accessible by authenticated students.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the assignmentId and cloudinaryUrl.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created submission object.
     */
    createSubmission: async (parent, { assignmentId, cloudinaryUrl }, context) => {
      if (!context.user || context.user.role !== 'student') {
        throw new Error('Unauthorized: Only students can create submissions.');
      }
      return assignmentService.createSubmission(context.supabase, assignmentId, context.user.user_id, cloudinaryUrl);
    },

    /**
     * Updates an existing submission (e.g., adds feedback and grade).
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the submission ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated submission object.
     */
    updateSubmission: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update submissions.');
      }
      return assignmentService.updateSubmission(context.supabase, id, input);
    },

    /**
     * Deletes a submission.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the submission ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteSubmission: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete submissions.');
      }
      await assignmentService.deleteSubmission(context.supabase, id);
      return `Submission with ID ${id} deleted successfully.`;
    },
  },

  // Resolvers for nested fields within the 'Submission' type
  Submission: {
    assignment: async (parent, args, context) => {
      // 'parent' here is the Submission object, which contains assignment_id
      return assignmentService.getAssignmentById(context.supabase, parent.assignment_id);
    },
    user: async (parent, args, context) => {
      // 'parent' here is the Submission object, which contains user_id
      return userService.getUserById(context.supabase, parent.user_id);
    },
  },
};

module.exports = submissionResolvers;
