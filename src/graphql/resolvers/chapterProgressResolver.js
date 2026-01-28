// src/graphql/resolvers/chapterProgressResolver.js
const chapterProgressService = require('../../services/chapterProgressService');
const userService = require('../../services/userService'); // For nested User data
const chapterService = require('../../services/chapterService'); // For nested Chapter data

const chapterProgressResolvers = {
  Query: {
    /**
     * Retrieves a user's progress for a specific chapter.
     * Accessible by the user themselves or by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the userId and chapterId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<object|null>} The chapter progress object, or null if no record exists.
     */
    chapterProgressByUserAndChapter: async (parent, { userId, chapterId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view chapter progress.');
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== userId) {
        throw new Error('Unauthorized: You can only view your own chapter progress.');
      }

      return chapterProgressService.getChapterProgressByUserAndChapter(context.supabase, userId, chapterId);
    },

    /**
     * Retrieves all chapter progress records for a specific user, optionally filtered by course.
     * Accessible by the user themselves or by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the userId and optional courseId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<Array<object>>} An array of chapter progress objects.
     */
    chapterProgressForUser: async (parent, { userId, courseId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view chapter progress.');
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== userId) {
        throw new Error('Unauthorized: You can only view your own chapter progress.');
      }

      return chapterProgressService.getChapterProgressForUser(context.supabase, userId, courseId);
    },

    /**
     * Checks if a user has completed all chapters for a given course.
     * Accessible by the user themselves or by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the userId and courseId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<boolean>} True if all chapters are completed, false otherwise.
     */
    checkCourseCompletion: async (parent, { userId, courseId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to check course completion.');
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== userId) {
        throw new Error('Unauthorized: You can only check your own course completion.');
      }

      return chapterProgressService.checkCourseCompletion(context.supabase, userId, courseId);
    },
  },

  Mutation: {
    /**
     * Marks a specific chapter as completed for the authenticated user.
     * Accessible only by authenticated students.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the chapterId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated or newly created chapter progress object.
     */
    markChapterCompleted: async (parent, { chapterId }, context) => {
      if (!context.user || context.user.role !== 'student') {
        throw new Error('Unauthorized: Only students can mark chapters as completed.');
      }
      return chapterProgressService.markChapterCompleted(context.supabase, context.user.user_id, chapterId);
    },
  },

  // Resolvers for nested fields within the 'ChapterProgress' type
  ChapterProgress: {
    user: async (parent, args, context) => {
      // 'parent' here is the ChapterProgress object, which contains user_id
      return userService.getUserById(context.supabase, parent.user_id);
    },
    chapter: async (parent, args, context) => {
      // 'parent' here is the ChapterProgress object, which contains chapter_id
      return chapterService.getChapterById(context.supabase, parent.chapter_id);
    },
  },
};

module.exports = chapterProgressResolvers;
