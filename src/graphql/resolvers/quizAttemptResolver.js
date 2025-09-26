// src/graphql/resolvers/quizAttemptResolver.js
const quizService = require('../../services/quizService'); // This service handles quiz attempt logic
const userService = require('../../services/userService'); // For nested User data

const quizAttemptResolvers = {
  Query: {
    /**
     * Retrieves all quiz attempts for a specific quiz.
     * Accessible by administrators.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing the quizId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of quiz attempt objects.
     */
    quizAttemptsByQuiz: async (parent, { quizId }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can view all quiz attempts for a quiz.');
      }
      return quizService.getQuizAttemptsByQuiz(context.supabase, quizId);
    },

    /**
     * Retrieves a single quiz attempt by its ID.
     * Accessible by administrators or the user who made the attempt.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the attempt ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The quiz attempt object, or null if not found.
     */
    quizAttempt: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view quiz attempt details.');
      }

      const attempt = await quizService.getQuizAttemptById(context.supabase, id);

      if (!attempt) {
        return null;
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== attempt.user_id) {
        throw new Error('Unauthorized: You can only view your own quiz attempts.');
      }

      return attempt;
    },

    /**
     * Retrieves all quiz attempts made by a specific user.
     * Accessible by administrators or the user themselves.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the userId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<Array<object>>} An array of quiz attempt objects.
     */
    quizAttemptsByUser: async (parent, { userId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view quiz attempts.');
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== userId) {
        throw new Error('Unauthorized: You can only view your own quiz attempts.');
      }

      return quizService.getQuizAttemptsByUser(context.supabase, userId);
    },
  },

  Mutation: {
    /**
     * Creates a new quiz attempt for the authenticated user.
     * Accessible by authenticated students.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the quizId and score.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created quiz attempt object.
     */
    createQuizAttempt: async (parent, { quizId, score }, context) => {
      if (!context.user || context.user.role !== 'student') {
        throw new Error('Unauthorized: Only students can create quiz attempts.');
      }
      return quizService.createQuizAttempt(context.supabase, quizId, context.user.user_id, score);
    },
  },

  // Resolvers for nested fields within the 'QuizAttempt' type
  QuizAttempt: {
    quiz: async (parent, args, context) => {
      // 'parent' here is the QuizAttempt object, which contains quiz_id
      return quizService.getQuizById(context.supabase, parent.quiz_id);
    },
    user: async (parent, args, context) => {
      // 'parent' here is the QuizAttempt object, which contains user_id
      return userService.getUserById(context.supabase, parent.user_id);
    },
  },
};

module.exports = quizAttemptResolvers;
