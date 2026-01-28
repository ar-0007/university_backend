// src/graphql/resolvers/mentorshipSlotResolver.js
const mentorshipService = require('../../services/mentorshipService');
const userService = require('../../services/userService'); // For nested User data

const mentorshipSlotResolvers = {
  Query: {
    /**
     * Retrieves all mentorship slots.
     * Accessible by all authenticated users (for available slots) or admins (for all slots).
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing optional filters (isBooked, mentorUserId).
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of mentorship slot objects.
     */
    mentorshipSlots: async (parent, { isBooked = false, mentorUserId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view mentorship slots.');
      }

      // If not an admin, only show available (not booked) slots and only future slots
      if (context.user.role !== 'admin') {
        isBooked = false; // Force to false for students
        // mentorUserId filter can still apply if a student wants to see a specific mentor's slots
      }

      return mentorshipService.getAllMentorshipSlots(context.supabase, isBooked, mentorUserId);
    },

    /**
     * Retrieves a single mentorship slot by its ID.
     * Accessible by administrators or the mentor/booked user associated with the slot.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the slot ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The mentorship slot object, or null if not found.
     */
    mentorshipSlot: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view mentorship slot details.');
      }

      const slot = await mentorshipService.getMentorshipSlotById(context.supabase, id);

      if (!slot) {
        return null;
      }

      // Authorization check: Admin OR the mentor OR the booked user
      if (context.user.role !== 'admin' &&
          context.user.user_id !== slot.mentorUserId &&
        context.user.user_id !== slot.bookedByUserId) {
        throw new Error('Unauthorized: You can only view your own mentorship slots or those you mentor.');
      }

      return slot;
    },
  },

  Mutation: {
    /**
     * Creates a new mentorship slot.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the slot input data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created mentorship slot object.
     */
    createMentorshipSlot: async (parent, { input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create mentorship slots.');
      }
      return mentorshipService.createMentorshipSlot(context.supabase, input);
    },

    /**
     * Updates an existing mentorship slot.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the slot ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated mentorship slot object.
     */
    updateMentorshipSlot: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update mentorship slots.');
      }
      return mentorshipService.updateMentorshipSlot(context.supabase, id, input);
    },

    /**
     * Deletes a mentorship slot.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the slot ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteMentorshipSlot: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete mentorship slots.');
      }
      await mentorshipService.deleteMentorshipSlot(context.supabase, id);
      return `Mentorship slot with ID ${id} deleted successfully.`;
    },
  },

  // Resolvers for nested fields within the 'MentorshipSlot' type
  MentorshipSlot: {
    mentor: async (parent, args, context) => {
      // 'parent' here is the MentorshipSlot object, which contains mentorUserId
      return userService.getUserById(context.supabase, parent.mentor_user_id);
    },
    bookedByUser: async (parent, args, context) => {
      // 'parent' here is the MentorshipSlot object, which contains bookedByUserId
      if (!parent.booked_by_user_id) {
        return null; // Return null if no user has booked the slot
      }
      return userService.getUserById(context.supabase, parent.booked_by_user_id);
    },
  },
};

module.exports = mentorshipSlotResolvers;
