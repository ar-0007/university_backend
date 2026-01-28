// src/graphql/resolvers/chapterResolver.js
const chapterService = require('../../services/chapterService'); // Import the Chapter Service
const chapterMediaService = require('../../services/chapterMediaService'); // Import Chapter Media Service for nested queries
const userChapterAccessService = require('../../services/userChapterAccessService'); // Import User Chapter Access Service

const chapterResolvers = {
  Query: {
    /**
     * Retrieves all chapters for a specific course.
     * Accessible by authenticated users who are enrolled in the course, or by admins.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing the courseId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of chapter objects.
     */
    chaptersByCourse: async (parent, { courseId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view chapters.');
      }

      // Get all chapters for the course
      const allChapters = await chapterService.getChaptersByCourse(context.supabase, courseId);
      
      // Filter chapters based on user access
      const accessibleChapters = [];
      for (const chapter of allChapters) {
        const isUnlocked = await userChapterAccessService.isChapterUnlocked(
          context.supabase,
          context.user.user_id,
          chapter.chapter_id
        );
        if (isUnlocked) {
          accessibleChapters.push(chapter);
        }
      }

      return accessibleChapters;
    },

    /**
     * Retrieves a single chapter by its ID.
     * Accessible by authenticated users who are enrolled in the course, or by admins.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the chapter ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The chapter object, or null if not found.
     */
    chapter: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view chapter details.');
      }
      const chapter = await chapterService.getChapterById(context.supabase, id);

      if (!chapter) {
        return null;
      }

      // Check if the user has access to this chapter
      const isUnlocked = await userChapterAccessService.isChapterUnlocked(
        context.supabase,
        context.user.user_id,
        chapter.chapter_id
      );

      if (!isUnlocked) {
        throw new Error('You do not have access to this chapter.');
      }

      return chapter;
    },
  },

  Mutation: {
    /**
     * Creates a new chapter.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the chapter input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created chapter object.
     */
    createChapter: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create chapters.');
      }
      return chapterService.createChapter(context.supabase, input);
    },

    /**
     * Updates an existing chapter.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the chapter ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated chapter object.
     */
    updateChapter: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update chapters.');
      }
      return chapterService.updateChapter(context.supabase, id, input);
    },

    /**
     * Deletes a chapter.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the chapter ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteChapter: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete chapters.');
      }
      await chapterService.deleteChapter(context.supabase, id);
      return `Chapter with ID ${id} deleted successfully.`;
    },
  },

  // Resolver for nested 'media' field within the 'Chapter' type
  // This allows fetching media items when querying a Chapter
  Chapter: {
    media: async (parent, args, context) => {
      // 'parent' here is the Chapter object returned by the 'chapter' or 'chaptersByCourse' query
      return chapterMediaService.getChapterMediaByChapter(context.supabase, parent.chapter_id);
    },
  },
};

module.exports = chapterResolvers;
