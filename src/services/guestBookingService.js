// src/services/guestBookingService.js

const guestBookingService = {
  /**
   * Creates a new guest booking
   * @param {object} supabase - The Supabase client instance.
   * @param {object} bookingData - Guest booking data.
   * @returns {Promise<object>} The newly created guest booking object.
   */
  createGuestBooking: async (supabase, bookingData) => {
    try {
      const {
        instructorId,
        customerName,
        customerEmail,
        customerPhone,
        preferredDate,
        preferredTime,
        message,
        preferredTopics,
        sessionPrice
      } = bookingData;

      const { data, error } = await supabase
        .from('guest_bookings')
        .insert([
          {
            instructor_id: instructorId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            preferred_date: preferredDate,
            preferred_time: preferredTime,
            message: message || null,
            preferred_topics: preferredTopics || [],
            session_price: sessionPrice,
            payment_status: 'PENDING',
            booking_status: 'PENDING'
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating guest booking:', error);
        throw new Error(`Failed to create guest booking: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createGuestBooking service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all guest bookings
   * @param {object} supabase - The Supabase client instance.
   * @param {string} [instructorId] - Optional. Filter by instructor ID.
   * @param {string} [paymentStatus] - Optional. Filter by payment status.
   * @param {string} [bookingStatus] - Optional. Filter by booking status.
   * @returns {Promise<Array<object>>} An array of guest booking objects.
   */
  getAllGuestBookings: async (supabase, instructorId = null, paymentStatus = null, bookingStatus = null) => {
    try {
      let query = supabase
        .from('guest_bookings')
        .select(`
          *,
          instructor:instructors(
            instructor_id,
            first_name,
            last_name,
            email,
            profile_image_url,
            hourly_rate
          )
        `)
        .order('created_at', { ascending: false });

      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }
      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }
      if (bookingStatus) {
        query = query.eq('booking_status', bookingStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching guest bookings:', error);
        throw new Error(`Failed to fetch guest bookings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllGuestBookings service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single guest booking by ID
   * @param {object} supabase - The Supabase client instance.
   * @param {string} bookingId - The UUID of the booking.
   * @returns {Promise<object|null>} The guest booking object, or null if not found.
   */
  getGuestBookingById: async (supabase, bookingId) => {
    try {
      const { data, error } = await supabase
        .from('guest_bookings')
        .select(`
          *,
          instructor:instructors(
            instructor_id,
            first_name,
            last_name,
            email,
            profile_image_url,
            hourly_rate
          )
        `)
        .eq('guest_booking_id', bookingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching guest booking by ID:', error);
        throw new Error(`Failed to fetch guest booking: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error in getGuestBookingById service:', error);
      throw error;
    }
  },

  /**
   * Updates a guest booking
   * @param {object} supabase - The Supabase client instance.
   * @param {string} bookingId - The UUID of the booking to update.
   * @param {object} updates - Fields to update.
   * @returns {Promise<object>} The updated guest booking object.
   */
  updateGuestBooking: async (supabase, bookingId, updates) => {
    try {
      const { data, error } = await supabase
        .from('guest_bookings')
        .update(updates)
        .eq('guest_booking_id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Error updating guest booking:', error);
        throw new Error(`Failed to update guest booking: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateGuestBooking service:', error);
      throw error;
    }
  },

  /**
   * Updates payment status for a guest booking
   * @param {object} supabase - The Supabase client instance.
   * @param {string} bookingId - The UUID of the booking.
   * @param {string} paymentStatus - New payment status.
   * @param {string} [paymentMethod] - Payment method used.
   * @param {string} [transactionId] - Transaction ID.
   * @returns {Promise<object>} The updated guest booking object.
   */
  updatePaymentStatus: async (supabase, bookingId, paymentStatus, paymentMethod = null, transactionId = null) => {
    try {
      const updateData = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };

      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }
      if (transactionId) {
        updateData.transaction_id = transactionId;
      }

      // If payment is successful, update booking status to confirmed
      if (paymentStatus === 'PAID') {
        updateData.booking_status = 'CONFIRMED';
        // Generate meeting link
        updateData.meeting_link = `https://meet.google.com/${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 4)}`;
      }

      return await guestBookingService.updateGuestBooking(supabase, bookingId, updateData);
    } catch (error) {
      console.error('Error in updatePaymentStatus service:', error);
      throw error;
    }
  },

  /**
   * Deletes a guest booking
   * @param {object} supabase - The Supabase client instance.
   * @param {string} bookingId - The UUID of the booking to delete.
   * @returns {Promise<void>}
   */
  deleteGuestBooking: async (supabase, bookingId) => {
    try {
      const { error } = await supabase
        .from('guest_bookings')
        .delete()
        .eq('guest_booking_id', bookingId);

      if (error) {
        console.error('Error deleting guest booking:', error);
        throw new Error(`Failed to delete guest booking: ${error.message}`);
      }

      console.log(`Guest booking ${bookingId} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteGuestBooking service:', error);
      throw error;
    }
  }
};

module.exports = guestBookingService; 