// src/services/mentorshipService.js

const mentorshipService = {
  // --- Mentorship Slot Operations ---
  /**
   * Creates a new mentorship slot.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} slotInput - Input data for the slot (mentorUserId, startTime, endTime, price).
   * @returns {Promise<object>} The newly created mentorship slot object.
   * @throws {Error} If slot creation fails.
   */
  createMentorshipSlot: async (supabase, slotInput) => {
    try {
      const { data, error } = await supabase
        .from('mentorship_slots')
        .insert([
          {
            mentor_user_id: slotInput.mentorUserId,
            start_time: slotInput.startTime,
            end_time: slotInput.endTime,
            price: slotInput.price,
            is_booked: false, // Default to not booked
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating mentorship slot:', error);
        throw new Error(`Failed to create mentorship slot: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createMentorshipSlot service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all mentorship slots, optionally filtered by booking status or mentor.
   * @param {object} supabase - The Supabase client instance.
   * @param {boolean} [isBooked=false] - Optional. Filter by booked status.
   * @param {string} [mentorUserId] - Optional. Filter by a specific mentor's ID.
   * @returns {Promise<Array<object>>} An array of mentorship slot objects.
   * @throws {Error} If fetching slots fails.
   */
  getAllMentorshipSlots: async (supabase, isBooked = false, mentorUserId = null) => {
    try {
      // Corrected select query: Use explicit aliases (mentor, bookedByUser) for the two user joins.
      // This prevents the "table name specified more than once" error.
      let query = supabase
        .from('mentorship_slots')
        .select(`
          *,
          mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, first_name, last_name, email, role),
          bookedByUser:users!mentorship_slots_booked_by_user_id_fkey(user_id, first_name, last_name, email, role)
        `)
        .order('start_time', { ascending: true });

      if (isBooked !== null) {
        query = query.eq('is_booked', isBooked);
      }
      if (mentorUserId) {
        query = query.eq('mentor_user_id', mentorUserId);
      }
      if (isBooked === false) {
        query = query.gte('start_time', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mentorship slots:', error);
        throw new Error(`Failed to fetch mentorship slots: ${error.message}`);
      }

      // Map the new aliases from the Supabase response to cleaner object keys
      return data.map(slot => ({
        ...slot,
        mentor: slot.mentor,
        bookedByUser: slot.bookedByUser,
      }));

    } catch (error) {
      console.error('Error in getAllMentorshipSlots service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single mentorship slot by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the slot.
   * @returns {Promise<object|null>} The mentorship slot object, or null if not found.
   * @throws {Error} If fetching the slot fails.
   */
  getMentorshipSlotById: async (supabase, id) => {
    try {
      // Corrected select query with aliases
      const { data, error } = await supabase
        .from('mentorship_slots')
        .select(`
          *,
          mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, first_name, last_name, email, role),
          bookedByUser:users!mentorship_slots_booked_by_user_id_fkey(user_id, first_name, last_name, email, role)
        `)
        .eq('slot_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching mentorship slot by ID:', error);
        throw new Error(`Failed to fetch mentorship slot: ${error.message}`);
      }

      if (!data) return null;

      // Map the new aliases
      return {
        ...data,
        mentor: data.mentor,
        bookedByUser: data.bookedByUser,
      };
    } catch (error) {
      console.error('Error in getMentorshipSlotById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing mentorship slot.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the slot to update.
   * @param {object} updates - Fields to update (startTime, endTime, isBooked, bookedByUserId, price).
   * @returns {Promise<object>} The updated mentorship slot object.
   * @throws {Error} If the update fails.
   */
  updateMentorshipSlot: async (supabase, id, updates) => {
    try {
      const updateData = {};
      if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.isBooked !== undefined) updateData.is_booked = updates.isBooked;
      if (updates.bookedByUserId !== undefined) updateData.booked_by_user_id = updates.bookedByUserId;
      if (updates.price !== undefined) updateData.price = updates.price;

      const { data, error } = await supabase
        .from('mentorship_slots')
        .update(updateData)
        .eq('slot_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating mentorship slot:', error);
        throw new Error(`Failed to update mentorship slot: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateMentorshipSlot service:', error);
      throw error;
    }
  },

  /**
   * Deletes a mentorship slot.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the slot to delete.
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails.
   */
  deleteMentorshipSlot: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('mentorship_slots')
        .delete()
        .eq('slot_id', id);

      if (error) {
        console.error('Error deleting mentorship slot:', error);
        throw new Error(`Failed to delete mentorship slot: ${error.message}`);
      }
      console.log(`Mentorship slot ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteMentorshipSlot service:', error);
      throw error;
    }
  },

  // --- Mentorship Booking Operations ---

  /**
   * Creates a new mentorship booking.
   * This also marks the corresponding slot as booked.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} slotId - The ID of the slot being booked.
   * @param {string} userId - The ID of the user booking the slot.
   * @param {string} [paymentMethod] - The payment method used.
   * @param {string} [transactionId] - The transaction ID from the payment gateway.
   * @returns {Promise<object>} The newly created mentorship booking object.
   * @throws {Error} If booking fails (e.g., slot already booked).
   */
  createMentorshipBooking: async (supabase, slotId, userId, paymentMethod = null, transactionId = null) => {
    try {
      // 1. Mark the slot as booked
      const { data: updatedSlot, error: slotUpdateError } = await supabase
        .from('mentorship_slots')
        .update({ is_booked: true, booked_by_user_id: userId })
        .eq('slot_id', slotId)
        .eq('is_booked', false) // Ensure it's not already booked
        .select()
        .single();

      if (slotUpdateError || !updatedSlot) {
        if (slotUpdateError && slotUpdateError.code === 'PGRST116') { // No rows updated means it was already booked
          throw new Error('Mentorship slot is already booked or does not exist.');
        }
        console.error('Error updating mentorship slot for booking:', slotUpdateError);
        throw new Error(`Failed to book slot: ${slotUpdateError.message}`);
      }

      // 2. Create the booking record
      const { data: newBooking, error: bookingError } = await supabase
        .from('mentorship_bookings')
        .insert([
          {
            slot_id: slotId,
            user_id: userId,
            payment_status: paymentMethod && transactionId ? 'PAID' : 'PENDING', // Assume paid if method/id provided
            payment_method: paymentMethod,
            transaction_id: transactionId,
          },
        ])
        .select()
        .single();

      if (bookingError) {
        // IMPORTANT: If booking fails here, you might need to un-book the slot
        console.error('Error creating mentorship booking:', bookingError);
        // Attempt to revert slot booking
        await supabase.from('mentorship_slots').update({ is_booked: false, booked_by_user_id: null }).eq('slot_id', slotId);
        throw new Error(`Failed to create mentorship booking: ${bookingError.message}`);
      }
      return newBooking;
    } catch (error) {
      console.error('Error in createMentorshipBooking service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all mentorship bookings, optionally filtered by user or payment status.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} [userId] - Optional. Filter by a specific user's ID.
   * @param {string} [paymentStatus] - Optional. Filter by payment status ('pending', 'paid', 'failed').
   * @returns {Promise<Array<object>>} An array of mentorship booking objects.
   * @throws {Error} If fetching bookings fails.
   */
  getAllMentorshipBookings: async (supabase, userId = null, paymentStatus = null) => {
    try {
      // Corrected nested select query with an alias for the user table
      let query = supabase
        .from('mentorship_bookings')
        .select(`
          *,
          mentorship_slots (
            slot_id, start_time, end_time, price, mentor_user_id, is_booked,
            mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, first_name, last_name, email, role)
          ),
          user:users ( user_id, first_name, last_name, email, role )
        `)
        .order('booked_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mentorship bookings:', error);
        throw new Error(`Failed to fetch mentorship bookings: ${error.message}`);
      }

      // Map Supabase aliases to cleaner object keys
      return data.map(booking => ({
        ...booking,
        slot: {
          ...booking.mentorship_slots,
          mentor: booking.mentorship_slots.mentor,
        },
        user: booking.user,
      }));

    } catch (error) {
      console.error('Error in getAllMentorshipBookings service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single mentorship booking by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the booking.
   * @returns {Promise<object|null>} The booking object, or null if not found.
   * @throws {Error} If fetching the booking fails.
   */
  getMentorshipBookingById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('mentorship_bookings')
        .select(`
          *,
          mentorship_slots (
            slot_id, start_time, end_time, price, mentor_user_id, is_booked,
            mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, first_name, last_name, email, role)
          ),
          user:users ( user_id, first_name, last_name, email, role )
        `)
        .eq('booking_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching mentorship booking by ID:', error);
        throw new Error(`Failed to fetch mentorship booking: ${error.message}`);
      }

      if (!data) return null;

      // Map the new aliases
      return {
        ...data,
        slot: {
          ...data.mentorship_slots,
          mentor: data.mentorship_slots.mentor,
        },
        user: data.user,
      };
    } catch (error) {
      console.error('Error in getMentorshipBookingById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing mentorship booking (e.g., payment status, Zoom link).
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the booking to update.
   * @param {object} updates - Fields to update (paymentStatus, paymentMethod, transactionId, zoomLink).
   * @returns {Promise<object>} The updated mentorship booking object.
   * @throws {Error} If the update fails.
   */
  updateMentorshipBooking: async (supabase, id, updates) => {
    try {
      const updateData = {};
      if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.transactionId !== undefined) updateData.transaction_id = updates.transactionId;
      if (updates.zoomLink !== undefined) updateData.zoom_link = updates.zoomLink;
      if (updates.rejectionReason !== undefined) updateData.rejection_reason = updates.rejectionReason;

      const { data, error } = await supabase
        .from('mentorship_bookings')
        .update(updateData)
        .eq('booking_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating mentorship booking:', error);
        throw new Error(`Failed to update mentorship booking: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateMentorshipBooking service:', error);
      throw error;
    }
  },

  /**
   * Deletes a mentorship booking.
   * Also un-books the associated slot.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the booking to delete.
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails.
   */
  deleteMentorshipBooking: async (supabase, id) => {
    try {
      // Get the slot_id before deleting the booking
      const { data: booking, error: fetchError } = await supabase
        .from('mentorship_bookings')
        .select('slot_id')
        .eq('booking_id', id)
        .single();

      if (fetchError || !booking) {
        throw new Error('Booking not found.');
      }

      const slotId = booking.slot_id;

      // Delete the booking record
      const { error: deleteError } = await supabase
        .from('mentorship_bookings')
        .delete()
        .eq('booking_id', id);

      if (deleteError) {
        console.error('Error deleting mentorship booking:', deleteError);
        throw new Error(`Failed to delete mentorship booking: ${deleteError.message}`);
      }

      // Un-book the associated slot
      const { error: slotUpdateError } = await supabase
        .from('mentorship_slots')
        .update({ is_booked: false, booked_by_user_id: null })
        .eq('slot_id', slotId);

      if (slotUpdateError) {
        console.warn(`Warning: Failed to un-book slot ${slotId} after booking deletion: ${slotUpdateError.message}`);
      }

      console.log(`Mentorship booking ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteMentorshipBooking service:', error);
      throw error;
    }
  },
};

module.exports = mentorshipService;
