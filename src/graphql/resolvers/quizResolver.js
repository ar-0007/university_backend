// src/graphql/resolvers/quizResolver.js
const quizService = require('../../services/quizService');
const chapterService = require('../../services/chapterService'); // For nested Chapter data

const quizResolvers = {
  Query: {
    /**
     * Retrieves all quizzes for a specific chapter.
     * Accessible by administrators or students (who are enrolled in the relevant course).
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing the chapterId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of quiz objects.
     */
    quizzesByChapter: async (parent, { chapterId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view quizzes.');
      }
      // TODO: Add more granular authorization here.
      // E.g., students can only see quizzes for chapters within courses they are enrolled in.
      // For now, if authenticated, they can query. Admin can see all.
      return quizService.getQuizzesByChapter(context.supabase, chapterId);
    },

    /**
     * Retrieves a single quiz by its ID.
     * Accessible by administrators or students (who are enrolled in the relevant course).
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the quiz ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The quiz object, or null if not found.
     */
    quiz: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view quiz details.');
      }
      const quiz = await quizService.getQuizById(context.supabase, id);

      if (!quiz) {
        return null;
      }

      // TODO: Add authorization check:
      // If student, ensure they are enrolled in the course associated with the quiz's chapter.
      // For now, if authenticated, they can access.

      return quiz;
    },
  },

  Mutation: {
    /**
     * Creates a new quiz.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the quiz input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created quiz object.
     */
    createQuiz: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create quizzes.');
      }
      return quizService.createQuiz(context.supabase, input);
    },

    /**
     * Updates an existing quiz.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the quiz ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated quiz object.
     */
    updateQuiz: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update quizzes.');
      }
      return quizService.updateQuiz(context.supabase, id, input);
    },

    /**
     * Deletes a quiz.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the quiz ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteQuiz: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete quizzes.');
      }
      await quizService.deleteQuiz(context.supabase, id);
      return `Quiz with ID ${id} deleted successfully.`;
    },
  },

  // Resolvers for nested fields within the 'Quiz' type
  Quiz: {
    chapter: async (parent, args, context) => {
      // 'parent' here is the Quiz object, which contains chapter_id
      return chapterService.getChapterById(context.supabase, parent.chapter_id);
    },
    attempts: async (parent, args, context) => {
      // 'parent' here is the Quiz object, which contains quiz_id
      // This query should be restricted to admins or the specific user if they made the attempt
      if (!context.user) {
        throw new Error('Authentication required to view quiz attempts.');
      }
      // If not admin, only return attempts by the current user for this quiz
      if (context.user.role !== 'admin') {
        const attempts = await quizService.getQuizAttemptsByQuiz(context.supabase, parent.quiz_id);
        return attempts.filter(attempt => attempt.user_id === context.user.user_id);
      }
      return quizService.getQuizAttemptsByQuiz(context.supabase, parent.quiz_id);
    },
  },
};

module.exports = quizResolvers;
