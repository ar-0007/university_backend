const { getSupabaseClient } = require('../utils/supabaseClient');
const guestBookingService = require('../services/guestBookingService');
const emailService = require('../services/emailService');
const { body, validationResult } = require('express-validator');

/**
 * Create a guest booking (redirects to checkout)
 */
const createGuestBooking = async (req, res) => {
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

    const supabase = getSupabaseClient();
    const {
      instructorId,
      customerName,
      customerEmail,
      customerPhone,
      preferredDate,
      preferredTime,
      message,
      preferredTopics
    } = req.body;

    // Get instructor details to get the hourly rate
    const { data: instructor, error: instructorError } = await supabase
      .from('instructors')
      .select('instructor_id, first_name, last_name, email, hourly_rate')
      .eq('instructor_id', instructorId)
      .single();

    if (instructorError || !instructor) {
      console.error('Error fetching instructor:', instructorError);
      return res.status(404).json({
        success: false,
        error: {
          code: 'INSTRUCTOR_NOT_FOUND',
          message: 'Instructor not found'
        }
      });
    }

    // Check if user exists and is blocked
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('is_active')
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

    // If user exists and is blocked, prevent booking
    if (existingUser && !existingUser.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_BLOCKED',
          message: 'Your account has been blocked. Please contact support for assistance.'
        }
      });
    }

    // Create guest booking
    const bookingData = {
      instructorId,
      customerName,
      customerEmail,
      customerPhone,
      preferredDate,
      preferredTime,
      message,
      preferredTopics,
      sessionPrice: instructor.hourly_rate || 0
    };

    const booking = await guestBookingService.createGuestBooking(supabase, bookingData);

    // Return booking details for checkout
    res.status(201).json({
      success: true,
      data: {
        guest_booking_id: booking.guest_booking_id,
        instructor_id: instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        session_price: instructor.hourly_rate,
        payment_status: booking.payment_status,
        checkout_url: `/checkout/${booking.guest_booking_id}` // Frontend checkout URL
      },
      message: 'Guest booking created successfully. Redirecting to checkout...'
    });
  } catch (error) {
    console.error('Error creating guest booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create guest booking'
      }
    });
  }
};

/**
 * Get guest booking by ID (for checkout page)
 */
const getGuestBookingById = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;
    
    const booking = await guestBookingService.getGuestBookingById(supabase, bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Guest booking not found'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Guest booking retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching guest booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch guest booking'
      }
    });
  }
};

/**
 * Update payment status for guest booking
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;
    
    const booking = await guestBookingService.updatePaymentStatus(
      supabase, 
      bookingId, 
      paymentStatus,
      paymentMethod,
      transactionId
    );

    // Send confirmation emails if payment is successful
    if (paymentStatus === 'PAID') {
      try {
        // Send confirmation email to customer
        await emailService.sendMentorshipConfirmation({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          instructorName: booking.instructor ? `${booking.instructor.first_name} ${booking.instructor.last_name}` : 'Your Instructor',
          scheduledDate: booking.preferred_date,
          scheduledTime: booking.preferred_time,
          meetingLink: booking.meeting_link,
          price: booking.session_price
        });

        // Send notification email to instructor
        if (booking.instructor) {
          await emailService.sendInstructorNotification(booking.instructor.email, {
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            scheduledDate: booking.preferred_date,
            scheduledTime: booking.preferred_time,
            meetingLink: booking.meeting_link
          });
        }
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Don't fail the payment update if email fails
      }
    }
    
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
 * Get all guest bookings (admin only)
 */
const getAllGuestBookings = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { instructorId, paymentStatus, bookingStatus } = req.query;
    
    const bookings = await guestBookingService.getAllGuestBookings(
      supabase, 
      instructorId, 
      paymentStatus, 
      bookingStatus
    );
    
    res.status(200).json({
      success: true,
      data: bookings,
      message: 'Guest bookings retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch guest bookings'
      }
    });
  }
};

/**
 * Update guest booking status (admin only)
 */
const updateBookingStatus = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;
    const { bookingStatus, meetingLink } = req.body;
    
    const updateData = { booking_status: bookingStatus };
    if (meetingLink) {
      updateData.meeting_link = meetingLink;
    }
    
    const booking = await guestBookingService.updateGuestBooking(supabase, bookingId, updateData);
    
    // Send confirmation emails if booking is confirmed
    if (bookingStatus === 'CONFIRMED') {
      try {
        // Send confirmation email to customer
        await emailService.sendMentorshipConfirmation({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          instructorName: booking.instructor ? `${booking.instructor.first_name} ${booking.instructor.last_name}` : 'Your Instructor',
          scheduledDate: booking.preferred_date,
          scheduledTime: booking.preferred_time,
          meetingLink: booking.meeting_link,
          price: booking.session_price
        });

        // Send notification email to instructor
        if (booking.instructor) {
          await emailService.sendInstructorNotification(booking.instructor.email, {
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            scheduledDate: booking.preferred_date,
            scheduledTime: booking.preferred_time,
            meetingLink: booking.meeting_link
          });
        }
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Don't fail the booking update if email fails
      }
    }

    // Send cancellation emails if booking is cancelled
    if (bookingStatus === 'CANCELLED') {
      try {
        // Send cancellation email to customer
        await emailService.sendBookingCancellation({
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          instructorName: booking.instructor ? `${booking.instructor.first_name} ${booking.instructor.last_name}` : 'Your Instructor',
          scheduledDate: booking.preferred_date,
          scheduledTime: booking.preferred_time,
          price: booking.session_price
        });

        // Send cancellation notification to instructor
        if (booking.instructor) {
          await emailService.sendInstructorCancellationNotification(booking.instructor.email, {
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            scheduledDate: booking.preferred_date,
            scheduledTime: booking.preferred_time
          });
        }
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Don't fail the booking update if email fails
      }
    }
    
    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update booking status'
      }
    });
  }
};

/**
 * Delete guest booking (admin only)
 */
const deleteGuestBooking = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = req.params;
    
    await guestBookingService.deleteGuestBooking(supabase, bookingId);
    
    res.status(200).json({
      success: true,
      message: 'Guest booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guest booking:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete guest booking'
      }
    });
  }
};

module.exports = {
  createGuestBooking,
  getGuestBookingById,
  updatePaymentStatus,
  getAllGuestBookings,
  updateBookingStatus,
  deleteGuestBooking
};