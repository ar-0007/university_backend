// src/graphql/resolvers/mentorshipBookingResolver.js
const mentorshipService = require('../../services/mentorshipService');
const userService = require('../../services/userService'); // For nested User data
// No direct import for mentorshipSlotService needed here as mentorshipService handles slot interactions

const mentorshipBookingResolvers = {
  Query: {
    /**
     * Retrieves all mentorship bookings.
     * Accessible only by administrators, or by the associated user for their own bookings.
     * @param {object} parent - The parent object (unused in root queries).
     * @param {object} args - Arguments containing optional filters (userId, paymentStatus).
     * @param {object} context - The GraphQL context (contains supabase and user info).
     * @returns {Promise<Array<object>>} An array of mentorship booking objects.
     */
    mentorshipBookings: async (parent, { userId, paymentStatus }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view mentorship bookings.');
      }

      // Authorization check: Admin can see all, students can only see their own.
      if (context.user.role !== 'admin') {
        // If a student tries to query for another user's bookings, deny.
        if (userId && context.user.user_id !== userId) {
          throw new Error('Unauthorized: You can only view your own mentorship bookings.');
        }
        // Force the userId to the authenticated user's ID if they are a student.
        userId = context.user.user_id;
      }

      return mentorshipService.getAllMentorshipBookings(context.supabase, userId, paymentStatus);
    },

    /**
     * Retrieves a single mentorship booking by its ID.
     * Accessible by administrators or the user associated with the booking.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the booking ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object|null>} The mentorship booking object, or null if not found.
     */
    mentorshipBooking: async (parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required to view mentorship booking details.');
      }

      const booking = await mentorshipService.getMentorshipBookingById(context.supabase, id);

      if (!booking) {
        return null;
      }

      // Authorization check: Admin OR the user themselves
      if (context.user.role !== 'admin' && context.user.user_id !== booking.userId) {
        throw new Error('Unauthorized: You can only view your own mentorship booking.');
      }

      return booking;
    },
  },

  Mutation: {
    /**
     * Creates a new mentorship booking.
     * Accessible by authenticated students.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the slotId, paymentMethod, and transactionId.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The newly created mentorship booking object.
     */
    createMentorshipBooking: async (parent, { slotId, paymentMethod, transactionId }, context) => {
      if (!context.user || context.user.role !== 'student') {
        throw new Error('Unauthorized: Only students can book mentorship slots.');
      }
      // The userId is taken from the authenticated user in the context.
      return mentorshipService.createMentorshipBooking(context.supabase, slotId, context.user.user_id, paymentMethod, transactionId);
    },

    /**
     * Updates an existing mentorship booking (e.g., payment status, Zoom link).
     * Accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the booking ID and update data.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<object>} The updated mentorship booking object.
     */
    updateMentorshipBooking: async (parent, { id, input }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can update mentorship bookings.');
      }
      return mentorshipService.updateMentorshipBooking(context.supabase, id, input);
    },

    /**
     * Deletes a mentorship booking.
     * Only accessible by administrators.
     * @param {object} parent - The parent object (unused).
     * @param {object} args - Arguments containing the booking ID.
     * @param {object} context - The GraphQL context.
     * @returns {Promise<string>} A success message.
     */
    deleteMentorshipBooking: async (parent, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can delete mentorship bookings.');
      }
      await mentorshipService.deleteMentorshipBooking(context.supabase, id);
      return `Mentorship booking with ID ${id} deleted successfully.`;
    },
  },

  // Resolvers for nested fields within the 'MentorshipBooking' type
  MentorshipBooking: {
    slot: async (parent, args, context) => {
      // 'parent' here is the MentorshipBooking object, which contains slot_id
      return mentorshipService.getMentorshipSlotById(context.supabase, parent.slot_id);
    },
    user: async (parent, args, context) => {
      // 'parent' here is the MentorshipBooking object, which contains user_id
      return userService.getUserById(context.supabase, parent.user_id);
    },
  },
};

module.exports = mentorshipBookingResolvers;
