const getSupabaseClient = require('../utils/supabaseClient');
const mentorshipService = require('../services/mentorshipService');
const emailService = require('../services/emailService');
const { body, validationResult } = require('express-validator');

/**
 * Get available mentorship slots for a specific instructor
 * NOTE: This function still requires an instructorId.
 */
const getAvailableSlots = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { instructorId } = req.params;

    // Get instructor details to get the user_id
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('user_id')
      .eq('instructor_id', instructorId)
      .single();

    if (instructorError || !instructor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INSTRUCTOR_NOT_FOUND',
          message: 'Instructor not found'
        }
      });
    }

    // Get available slots for the instructor
    const slots = await mentorshipService.getAllMentorshipSlots(supabase, false, instructor.user_id);

    res.status(200).json({
      success: true,
      data: slots,
      message: 'Available slots retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch available slots'
      }
    });
  }
};

/**
 * Create a mentorship booking (public route - no authentication required)
 * V2 - UPDATED: All instructor logic has been removed.
 */
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing');
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Database configuration is missing'
        }
      });
    }

    const supabase = getSupabaseClient();
    
    // --- Prepare or create user account based on customerEmail ---
    const { customerEmail, customerName } = req.body;
    let userData = null;
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', customerEmail)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking existing user:', userCheckError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'USER_CHECK_ERROR',
          message: 'Failed to check user account'
        }
      });
    }

    if (existingUser) {
      if (!existingUser.is_active) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'USER_BLOCKED',
            message: 'Your account has been blocked. Please contact support for assistance.'
          }
        });
      }
      userData = existingUser;
    } else {
      // Create a guest user
      const guestUser = {
        firstName: customerName.split(' ')[0] || customerName,
      lastName: customerName.split(' ').slice(1).join(' ') || '',
        email: customerEmail,
        role: 'GUEST',
        is_active: true
      };

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([guestUser])
        .select()
        .single();

      if (userError) {
        console.error('Error creating guest user:', userError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_CREATION_ERROR',
            message: 'Failed to create user account'
          }
        });
      }
      userData = newUser;
    }
    
    // --- All Instructor Logic is Removed ---
    // We get the remaining data from the request
    const {
      customerPhone,
      preferredDate,
      preferredTime,
      // 'instructorId' is no longer needed here
    } = req.body;

    // --- Create a mentorship slot (without an instructor) ---
    const startTime = new Date(`${preferredDate}T${preferredTime}`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour session
    
    // !! IMPORTANT: Set a default price since there is no instructor.
    // You can change this '0' to any default price you want.
    const DEFAULT_PRICE = 0; 

    const slotInput = {
      mentorUserId: null, // <-- Set to null because instructor is removed
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      price: DEFAULT_PRICE 
    };

    let slot;
    try {
      slot = await mentorshipService.createMentorshipSlot(supabase, slotInput);
    } catch (slotError) {
      console.error('Error creating mentorship slot:', slotError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SLOT_CREATION_ERROR',
          message: 'Failed to create mentorship slot',
          details: slotError.message
        }
      });
    }

    // --- Create the booking ---
    let booking;
    try {
      booking = await mentorshipService.createMentorshipBooking(
        supabase,
        slot.slot_id,
        userData.user_id
      );
    } catch (bookingError) {
      console.error('Error creating mentorship booking:', bookingError);
      // Clean up the slot if booking fails
      try {
        await supabase.from('mentorship_slots').delete().eq('slot_id', slot.slot_id);
      } catch (cleanupError) {
        console.error('Error cleaning up slot after booking failure:', cleanupError);
      }
      return res.status(500).json({
        success: false,
        error: {
          code: 'BOOKING_CREATION_ERROR',
          message: 'Failed to create mentorship booking',
          details: bookingError.message
        }
      });
    }

    // --- Generate meeting link ---
    const meetingLink = `https://meet.google.com/${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 4)}`;

    // --- Send confirmation email to customer (no instructor name) ---
    try {
      await emailService.sendMentorshipConfirmation({
        customerName,
        customerEmail,
        instructorName: "Detailer University Team", // <-- Changed to generic name
        scheduledDate: preferredDate,
        scheduledTime: preferredTime,
        meetingLink,
        price: DEFAULT_PRICE
      });
      // Notify admin of the new booking (fixed email)
      const adminEmail = 'abdullahjunaid233@gmail.com';
      await emailService.sendAdminMentorshipNotification(adminEmail, {
        customerName,
        customerEmail,
        customerPhone,
        scheduledDate: preferredDate,
        scheduledTime: preferredTime,
        meetingLink,
        price: DEFAULT_PRICE
      });
    } catch (emailError) {
      console.error('Error sending customer confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // --- Instructor notification email is removed ---

    // --- Send 201 Success Response ---
    res.status(201).json({
      success: true,
      data: {
        booking_id: booking.booking_id,
        slot_id: booking.slot_id,
        user_id: booking.user_id,
        payment_status: booking.payment_status,
        scheduled_date: preferredDate,
        scheduled_time: preferredTime,
        instructor_id: null, // <-- Set to null
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        meeting_link: meetingLink
      },
      message: 'Mentorship booking created successfully. Check your email for meeting details.'
    });
  } catch (error) {
    console.error('Error creating mentorship booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create mentorship booking'
      }
    });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;

    const booking = await mentorshipService.getMentorshipBookingById(supabase, bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch booking'
      }
    });
  }
};

/**
 * Update booking payment status
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;
    const { paymentStatus, transactionId, paymentMethod } = req.body;

    const booking = await mentorshipService.updateMentorshipBooking(
      supabase,
      bookingId,
      {
        paymentStatus,
        transactionId,
        paymentMethod
      }
    );

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update payment status'
      }
    });
  }
};

/**
 * Get upcoming mentorship sessions (public endpoint)
 * NOTE: This function still has instructor logic.
 */
const getUpcomingMentorshipSessions = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const limit = parseInt(req.query.limit) || 10;

    // Get upcoming mentorship bookings with mentor details
    const { data: mentorshipBookings, error: mentorshipError } = await supabase
      .from('mentorship_bookings')
      .select(`
        booking_id,
        user_id,
        slot_id,
        payment_status,
        zoom_link,
        booked_at,
        created_at,
        users!inner(user_id, firstName, lastName, email),
        mentorship_slots!inner(
          slot_id,
          start_time,
          end_time,
          mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, firstName, lastName, email)
        )
      `)
      .gte('mentorship_slots.start_time', new Date().toISOString())
      .eq('payment_status', 'PAID')
      .order('mentorship_slots(start_time)', { ascending: true })
      .limit(limit);

    if (mentorshipError) {
      console.error('Error fetching mentorship bookings:', mentorshipError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch mentorship bookings'
        }
      });
    }

    // Get upcoming guest bookings with instructor details
    const { data: guestBookings, error: guestError } = await supabase
      .from('guest_bookings')
      .select(`
        guest_booking_id,
        customer_name,
        customer_email,
        instructor_id,
        preferred_date,
        preferred_time,
        payment_status,
        meeting_link,
        created_at,
        instructors!inner(instructor_id, firstName, lastName, email)
      `)
      .gte('preferred_date', new Date().toISOString().split('T')[0])
      .eq('payment_status', 'PAID')
      .order('preferred_date', { ascending: true })
      .order('preferred_time', { ascending: true })
      .limit(limit);

    if (guestError) {
      console.error('Error fetching guest bookings:', guestError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch guest bookings'
        }
      });
    }

    // Format mentorship bookings
    const formattedMentorshipBookings = (mentorshipBookings || []).map(booking => ({
      booking_id: booking.booking_id,
      user_id: booking.user_id,
      mentor_id: booking.mentorship_slots.mentor.user_id,
      slot_id: booking.slot_id,
      date: booking.mentorship_slots.start_time.split('T')[0],
      time_slot: `${new Date(booking.mentorship_slots.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.mentorship_slots.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'confirmed',
      payment_status: booking.payment_status,
      zoom_link: booking.zoom_link,
      created_at: booking.created_at,
      user: {
        user_id: booking.users.user_id,
        firstName: booking.users.firstName,
      lastName: booking.users.lastName,
        email: booking.users.email
      },
      mentor: {
        mentor_id: booking.mentorship_slots.mentor.user_id,
        firstName: booking.mentorship_slots.mentor.firstName,
      lastName: booking.mentorship_slots.mentor.lastName,
        email: booking.mentorship_slots.mentor.email
      },
      type: 'mentorship'
    }));

    // Format guest bookings
    const formattedGuestBookings = (guestBookings || []).map(booking => ({
      booking_id: booking.guest_booking_id,
      instructor_id: booking.instructor_id,
      date: booking.preferred_date,
      time_slot: booking.preferred_time,
      status: 'confirmed',
      payment_status: booking.payment_status,
      zoom_link: booking.meeting_link,
      created_at: booking.created_at,
      user: {
        firstName: booking.customer_name?.split(' ')[0] || '',
      lastName: booking.customer_name?.split(' ').slice(1).join(' ') || '',
        email: booking.customer_email
      },
      mentor: {
        mentor_id: booking.instructors.instructor_id,
        firstName: booking.instructors.firstName,
      lastName: booking.instructors.lastName,
        email: booking.instructors.email
      },
      type: 'guest'
    }));

    // Combine and sort all bookings
    const allBookings = [...formattedMentorshipBookings, ...formattedGuestBookings]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: allBookings,
      message: 'Upcoming mentorship sessions retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching upcoming mentorship sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch upcoming mentorship sessions'
      }
    });
  }
};

module.exports = {
  getAvailableSlots,
  createBooking,
  getBookingById,
  updatePaymentStatus,
  getUpcomingMentorshipSessions
};