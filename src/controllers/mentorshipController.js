const { getSupabaseClient } = require('../utils/supabaseClient');
const mentorshipService = require('../services/mentorshipService');

/**
 * Get all mentorship requests (bookings)
 */
const getAllRequests = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { status } = req.query;
    
    // Map status to payment_status for database query
    let paymentStatus = null;
    if (status === 'pending') paymentStatus = 'PENDING';
    else if (status === 'approved') paymentStatus = 'PAID';
    else if (status === 'rejected') paymentStatus = 'FAILED';
    
    const bookings = await mentorshipService.getAllMentorshipBookings(supabase, null, paymentStatus);
    
    // Transform bookings to match frontend request format
    const requests = bookings.map(booking => ({
      request_id: booking.booking_id,
      user_id: booking.user_id,
      message: booking.message || 'Mentorship request',
      preferred_topics: booking.preferred_topics || [],
      status: booking.payment_status === 'PENDING' ? 'pending' : 
              booking.payment_status === 'PAID' ? 'approved' : 'rejected',
      requested_at: booking.booked_at,
      scheduled_date: booking.slot?.start_time ? new Date(booking.slot.start_time).toISOString().split('T')[0] : null,
      scheduled_time: booking.slot?.start_time ? new Date(booking.slot.start_time).toTimeString().split(' ')[0] : null,
      duration_minutes: booking.slot ? Math.round((new Date(booking.slot.end_time) - new Date(booking.slot.start_time)) / 60000) : null,
      zoom_link: booking.zoom_link,
      rejection_reason: booking.rejection_reason,
      user: booking.user
    }));
    
    res.status(200).json({
      success: true,
      data: requests,
      message: 'Mentorship requests retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching mentorship requests:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch mentorship requests'
      }
    });
  }
};

/**
 * Get mentorship request by ID
 */
const getRequestById = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    
    const booking = await mentorshipService.getMentorshipBookingById(supabase, id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Mentorship request not found'
        }
      });
    }
    
    // Transform booking to request format
    const request = {
      request_id: booking.booking_id,
      user_id: booking.user_id,
      message: booking.message || 'Mentorship request',
      preferred_topics: booking.preferred_topics || [],
      status: booking.payment_status === 'PENDING' ? 'pending' : 
              booking.payment_status === 'PAID' ? 'approved' : 'rejected',
      requested_at: booking.booked_at,
      scheduled_date: booking.slot?.start_time ? new Date(booking.slot.start_time).toISOString().split('T')[0] : null,
      scheduled_time: booking.slot?.start_time ? new Date(booking.slot.start_time).toTimeString().split(' ')[0] : null,
      duration_minutes: booking.slot ? Math.round((new Date(booking.slot.end_time) - new Date(booking.slot.start_time)) / 60000) : null,
      zoom_link: booking.zoom_link,
      rejection_reason: booking.rejection_reason,
      user: booking.user
    };
    
    res.status(200).json({
      success: true,
      data: request,
      message: 'Mentorship request retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching mentorship request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch mentorship request'
      }
    });
  }
};

/**
 * Approve mentorship request with Google Meet link
 */
const approveRequest = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { scheduled_date, scheduled_time, duration_minutes, zoom_link } = req.body;
    
    if (!zoom_link) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Google Meet link is required for approval'
        }
      });
    }
    
    // Update booking to approved status with Google Meet link
    const updatedBooking = await mentorshipService.updateMentorshipBooking(supabase, id, {
      paymentStatus: 'PAID', // PAID = approved
      zoomLink: zoom_link
    });
    
    // Transform to request format
    const request = {
      request_id: updatedBooking.booking_id,
      user_id: updatedBooking.user_id,
      message: updatedBooking.message || 'Mentorship request',
      preferred_topics: updatedBooking.preferred_topics || [],
      status: 'approved',
      requested_at: updatedBooking.booked_at,
      scheduled_date: updatedBooking.slot?.start_time ? new Date(updatedBooking.slot.start_time).toISOString().split('T')[0] : scheduled_date,
      scheduled_time: updatedBooking.slot?.start_time ? new Date(updatedBooking.slot.start_time).toTimeString().split(' ')[0] : scheduled_time,
      duration_minutes: duration_minutes || (updatedBooking.slot ? Math.round((new Date(updatedBooking.slot.end_time) - new Date(updatedBooking.slot.start_time)) / 60000) : null),
      zoom_link: updatedBooking.zoom_link,
      user: updatedBooking.user
    };
    
    res.status(200).json({
      success: true,
      data: request,
      message: 'Mentorship request approved successfully'
    });
  } catch (error) {
    console.error('Error approving mentorship request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve mentorship request'
      }
    });
  }
};

/**
 * Reject mentorship request
 */
const rejectRequest = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { rejection_reason } = req.body;
    
    // Update booking to rejected status
    const updatedBooking = await mentorshipService.updateMentorshipBooking(supabase, id, {
      paymentStatus: 'FAILED', // FAILED = rejected
      rejectionReason: rejection_reason
    });
    
    // Transform to request format
    const request = {
      request_id: updatedBooking.booking_id,
      user_id: updatedBooking.user_id,
      message: updatedBooking.message || 'Mentorship request',
      preferred_topics: updatedBooking.preferred_topics || [],
      status: 'rejected',
      requested_at: updatedBooking.booked_at,
      rejection_reason: updatedBooking.rejection_reason,
      user: updatedBooking.user
    };
    
    res.status(200).json({
      success: true,
      data: request,
      message: 'Mentorship request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting mentorship request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reject mentorship request'
      }
    });
  }
};

/**
 * Get all mentorship slots
 */
const getAllSlots = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const slots = await mentorshipService.getAllMentorshipSlots(supabase);
    
    // Transform slots to match frontend format
    const transformedSlots = slots.map(slot => ({
      slot_id: slot.slot_id,
      mentor_id: slot.mentor_user_id,
      date: new Date(slot.start_time).toISOString().split('T')[0],
      time_slot: `${new Date(slot.start_time).toTimeString().split(' ')[0]} - ${new Date(slot.end_time).toTimeString().split(' ')[0]}`,
      is_available: !slot.is_booked,
      price: slot.price,
      mentor: slot.mentor
    }));
    
    res.status(200).json({
      success: true,
      data: transformedSlots,
      message: 'Mentorship slots retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching mentorship slots:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch mentorship slots'
      }
    });
  }
};

/**
 * Delete mentorship request
 */
const deleteRequest = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    
    await mentorshipService.deleteMentorshipBooking(supabase, id);
    
    res.status(200).json({
      success: true,
      message: 'Mentorship request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting mentorship request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete mentorship request'
      }
    });
  }
};

module.exports = {
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  getAllSlots,
  deleteRequest
};