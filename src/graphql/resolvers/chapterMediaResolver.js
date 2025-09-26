// src/graphql/resolvers/chapterMediaResolver.js
const chapterMediaService = require('../../services/chapterMediaService'); // Import the Chapter Media Service
const chapterService = require('../../services/chapterService'); // Import Chapter Service to get course ID for authorization
const userChapterAccessService = require('../../services/userChapterAccessService'); // Import User Chapter Access Service

const chapterMediaResolvers = {
  Query: {
    /**
     * Retrieves all media entries for a specific chapter.
     * Accessible by authenticated users who are enrolled in the course, or by admins.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing the chapterId.
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of chapter media objects.
     */
    chapterMediaByChapter: async (parent, { chapterId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view chapter media.');
      }

      const chapter = await chapterService.getChapterById(context.supabase, chapterId);
      if (!chapter) {
        throw new Error('Chapter not found.');
      }

      // Check if the user has access to this chapter
      const isUnlocked = await userChapterAccessService.isChapterUnlocked(
        context.supabase,
        context.user.user_id,
        chapterId
      );

      if (!isUnlocked) {
        throw new Error('You do not have access to this chapter media.');
      }

      return chapterMediaService.getChapterMediaByChapter(context.supabase, chapterId);
    },

    /**
     * Retrieves a single chapter media entry by its ID.
     * Accessible by authenticated users who are enrolled in the course, or by admins.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the media ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The chapter media object, or null if not found.
     */
    chapterMedia: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view media details.');
      }
      const media = await chapterMediaService.getChapterMediaById(context.supabase, id);

      if (!media) {
        return null;
      }

      // Check if the user has access to the chapter containing this media
      const isUnlocked = await userChapterAccessService.isChapterUnlocked(
        context.supabase,
        context.user.user_id,
        media.chapter_id
      );

      if (!isUnlocked) {
        throw new Error('You do not have access to this chapter media.');
      }

      return media;
    },
  },

  Mutation: {
    /**
     * Creates a new chapter media entry.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the media input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created chapter media object.
     */
    createChapterMedia: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create chapter media.');
      }
      return chapterMediaService.createChapterMedia(context.supabase, input);
    },

    /**
     * Updates an existing chapter media entry.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the media ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated chapter media object.
     */
    updateChapterMedia: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update chapter media.');
      }
      return chapterMediaService.updateChapterMedia(context.supabase, id, input);
    },

    /**
     * Deletes a chapter media entry.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the media ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteChapterMedia: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete chapter media.');
      }
      await chapterMediaService.deleteChapterMedia(context.supabase, id);
      return `Chapter Media with ID ${id} deleted successfully.`;
    },
  },
};

module.exports = chapterMediaResolvers;
