// src/graphql/resolvers/podcastResolver.js
const podcastService = require('../../services/podcastService');

const podcastResolvers = {
  Query: {
    /**
     * Retrieves all podcasts.
     * Accessible by all authenticated users.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments passed to the query (none for now).
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of podcast objects.
     */
    podcasts: async (parent, args, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view podcasts.');
      }
      // Only return released podcasts, handled by the service layer
      return podcastService.getAllPodcasts(context.supabase);
    },

    /**
     * Retrieves a single podcast by its ID.
     * Accessible by all authenticated users.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the podcast ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The podcast object, or null if not found.
     */
    podcast: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view podcast details.');
      }
      const podcast = await podcastService.getPodcastById(context.supabase, id);

      // Add a check to ensure podcast is released if the user is not an admin.
      // Admins can view unreleased podcasts.
      if (podcast && !podcast.release_date && context.user.role !== 'admin') {
         throw new Error('Unauthorized: Podcast is not yet released.');
      }
      if (podcast && new Date(podcast.release_date) > new Date() && context.user.role !== 'admin') {
          throw new Error('Unauthorized: Podcast is not yet released.');
      }

      return podcast;
    },
  },

  Mutation: {
    /**
     * Creates a new podcast.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the podcast input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created podcast object.
     */
    createPodcast: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create podcasts.');
      }
      return podcastService.createPodcast(context.supabase, input);
    },

    /**
     * Updates an existing podcast.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the podcast ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated podcast object.
     */
    updatePodcast: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update podcasts.');
      }
      return podcastService.updatePodcast(context.supabase, id, input);
    },

    /**
     * Deletes a podcast.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the podcast ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deletePodcast: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete podcasts.');
      }
      await podcastService.deletePodcast(context.supabase, id);
      return `Podcast with ID ${id} deleted successfully.`;
    },
  },
};

module.exports = podcastResolvers;
