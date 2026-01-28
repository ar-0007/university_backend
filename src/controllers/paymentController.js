const { v4: uuidv4 } = require('uuid');
const squareService = require('../services/squareService');
const { getSupabaseClient } = require('../utils/supabaseClient');
const guestBookingService = require('../services/guestBookingService');
const guestCoursePurchaseService = require('../services/guestCoursePurchaseService');

// Create payment intent for course purchase
const createCoursePaymentIntent = async (req, res) => {
  try {
    const { courseId, amount, currency = 'usd' } = req.body;
    const userId = req.user.user_id;
    const supabase = getSupabaseClient();

    // Validate course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }

    // Check if user is blocked
    const { data: user } = await supabase
      .from('users')
      .select('is_active')
      .eq('user_id', userId)
      .single();

    if (user && !user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_BLOCKED',
          message: 'Your account has been blocked. Please contact support.'
        }
      });
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: 'User is already enrolled in this course'
        }
      });
    }

    const intentId = `sq_int_${uuidv4()}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        course_id: courseId,
        amount,
        currency: currency.toUpperCase(),
        payment_method: 'square',
        payment_intent_id: intentId,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_CREATION_FAILED',
          message: 'Failed to create payment record'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        client_secret: null,
        payment_intent_id: intentId,
        amount,
        currency: currency.toUpperCase(),
        payment_id: payment.payment_id,
        location_id: process.env.SQUARE_LOCATION_ID
      },
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Create payment intent for mentorship booking
const createMentorshipPaymentIntent = async (req, res) => {
  try {
    const { slotId, amount, currency = 'usd' } = req.body;
    const userId = req.user.user_id;
    const supabase = getSupabaseClient();

    // Validate mentorship slot exists and is available
    const { data: slot, error: slotError } = await supabase
      .from('mentorship_slots')
      .select('*')
      .eq('slot_id', slotId)
      .eq('is_available', true)
      .single();

    if (slotError || !slot) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SLOT_NOT_AVAILABLE',
          message: 'Mentorship slot not found or not available'
        }
      });
    }

    const intentId = `sq_int_${uuidv4()}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        mentorship_slot_id: slotId,
        amount,
        currency: currency.toUpperCase(),
        payment_method: 'square',
        payment_intent_id: intentId,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_CREATION_FAILED',
          message: 'Failed to create payment record'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        client_secret: null,
        payment_intent_id: intentId,
        amount,
        currency: currency.toUpperCase(),
        payment_id: payment.payment_id,
        location_id: process.env.SQUARE_LOCATION_ID
      },
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Error creating mentorship payment intent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Confirm payment and complete enrollment/booking
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, sourceId } = req.body;
    const userId = req.user.user_id;
    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_SOURCE_ID', message: 'Source ID is required' }
      });
    }

    const supabase = getSupabaseClient();

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      console.error('Error updating payment status:', paymentError);
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found'
        }
      });
    }

    const locationId = process.env.SQUARE_LOCATION_ID;
    const note = payment.course_id ? 'Course purchase' : 'Mentorship booking';
    const metadata = { userId, courseId: payment.course_id || null, slotId: payment.mentorship_slot_id || null };
    const sq = await squareService.createPayment({
      amount: payment.amount,
      currency: payment.currency,
      sourceId,
      idempotencyKey: paymentIntentId,
      locationId,
      note,
      metadata
    });

    if (!sq.success) {
      return res.status(400).json({ success: false, error: { code: 'PAYMENT_FAILED', message: sq.error.message } });
    }

    const { data: updatedPayment } = await supabase
      .from('payments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('payment_intent_id', paymentIntentId)
      .eq('user_id', userId)
      .select()
      .single();

    // Handle course enrollment
    if (payment.course_id) {
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          course_id: payment.course_id,
          status: 'APPROVED',
          payment_status: 'paid',
          requested_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        });

      if (enrollmentError) {
        console.error('Error creating enrollment:', enrollmentError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'ENROLLMENT_CREATION_FAILED',
            message: 'Payment completed but enrollment creation failed'
          }
        });
      }
    }

    // Handle mentorship booking
    if (payment.mentorship_slot_id) {
      // Get slot details
      const { data: slot } = await supabase
        .from('mentorship_slots')
        .select('*')
        .eq('slot_id', payment.mentorship_slot_id)
        .single();

      if (slot) {
        // Create mentorship booking
        const { error: bookingError } = await supabase
          .from('mentorship_bookings')
          .insert({
            user_id: userId,
            mentor_id: slot.mentor_id,
            slot_id: payment.mentorship_slot_id,
            date: slot.date,
            time_slot: slot.time_slot,
            status: 'confirmed',
            payment_status: 'paid'
          });

        if (bookingError) {
          console.error('Error creating mentorship booking:', bookingError);
          return res.status(500).json({
            success: false,
            error: {
              code: 'BOOKING_CREATION_FAILED',
              message: 'Payment completed but booking creation failed'
            }
          });
        }

        // Mark slot as unavailable
        await supabase
          .from('mentorship_slots')
          .update({ is_available: false })
          .eq('slot_id', payment.mentorship_slot_id);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        payment,
        paymentIntent: {
          id: sq.data.id,
          status: sq.data.status,
          amount: sq.data.amountMoney?.amount ? sq.data.amountMoney.amount / 100 : payment.amount,
          currency: sq.data.amountMoney?.currency || payment.currency
        }
      },
      message: 'Payment confirmed and processed successfully'
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Get payment history for user
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { data: payments, error, count } = await supabase
      .from('payments')
      .select(`
        *,
        courses:course_id(title, description),
        mentorship_slots:mentorship_slot_id(date, time_slot, mentors:mentor_id(first_name, last_name))
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching payment history:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch payment history'
        }
      });
    }

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages
        }
      },
      message: 'Payment history retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Get payment statistics (admin only)
const getPaymentStats = async (req, res) => {
  try {
    // Total revenue
    const { data: totalRevenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = totalRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Monthly revenue (last 12 months)
    const { data: monthlyRevenueData } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    // Group by month
    const monthlyRevenue = {};
    monthlyRevenueData?.forEach(payment => {
      const month = new Date(payment.created_at).toISOString().slice(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + payment.amount;
    });

    // Payment method distribution
    const { data: paymentMethodData } = await supabase
      .from('payments')
      .select('payment_method')
      .eq('status', 'completed');

    const paymentMethods = {};
    paymentMethodData?.forEach(payment => {
      paymentMethods[payment.payment_method] = (paymentMethods[payment.payment_method] || 0) + 1;
    });

    // Recent transactions
    const { data: recentTransactions } = await supabase
      .from('payments')
      .select(`
        *,
        users:user_id(first_name, last_name, email),
        courses:course_id(title),
        mentorship_slots:mentorship_slot_id(date, time_slot)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        monthlyRevenue,
        paymentMethods,
        recentTransactions
      },
      message: 'Payment statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

 

// Create payment intent for guest booking
const createGuestBookingPaymentIntent = async (req, res) => {
  try {
    console.log('Creating guest booking payment intent:', req.body);
    const { bookingId, amount, currency = 'usd' } = req.body;

    // Validate required fields
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_BOOKING_ID',
          message: 'Booking ID is required'
        }
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Valid amount is required'
        }
      });
    }

    const supabase = getSupabaseClient();

    // Validate guest booking exists
    const booking = await guestBookingService.getGuestBookingById(supabase, bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'Guest booking not found'
        }
      });
    }

    // Check if booking is already paid
    if (booking.payment_status === 'PAID') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_PAID',
          message: 'Booking is already paid'
        }
      });
    }

    const intentId = `sq_int_${uuidv4()}`;
    await guestBookingService.updateGuestBooking(supabase, bookingId, {
      payment_method: 'square',
      transaction_id: intentId
    });

    res.status(200).json({
      success: true,
      data: {
        client_secret: null,
        payment_intent_id: intentId,
        amount,
        currency: currency.toUpperCase(),
        location_id: process.env.SQUARE_LOCATION_ID
      },
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Error creating guest booking payment intent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Confirm payment for guest booking
const confirmGuestBookingPayment = async (req, res) => {
  try {
    const { paymentIntentId, sourceId } = req.body;
    const supabase = getSupabaseClient();

    if (!sourceId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_SOURCE_ID', message: 'Source ID is required' } });
    }

    const { data: booking } = await supabase
      .from('guest_bookings')
      .select('*')
      .eq('transaction_id', paymentIntentId)
      .single();

    if (!booking) {
      return res.status(404).json({ success: false, error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found for intent' } });
    }

    const locationId = process.env.SQUARE_LOCATION_ID;
    const sq = await squareService.createPayment({
      amount: booking.session_price,
      currency: 'USD',
      sourceId,
      idempotencyKey: paymentIntentId,
      locationId,
      note: 'Guest mentorship booking',
      metadata: { bookingId: booking.guest_booking_id }
    });

    if (sq.success) {
      await guestBookingService.updatePaymentStatus(supabase, booking.guest_booking_id, 'PAID', 'square', sq.data.id);

      res.status(200).json({
        success: true,
        data: {
          payment_intent_id: paymentIntentId,
          status: 'succeeded',
          booking: booking
        },
        message: 'Payment confirmed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Payment confirmation failed'
        }
      });
    }

  } catch (error) {
    console.error('Error confirming guest booking payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Create payment intent for guest course purchase
const createGuestCoursePaymentIntent = async (req, res) => {
  try {
    console.log('🔄 Creating guest course payment intent...');
    console.log('Request body:', req.body);
    
    const { purchaseId, amount, currency = 'usd' } = req.body;

    if (!purchaseId) {
      console.error('❌ Missing purchaseId in request');
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PURCHASE_ID',
          message: 'Purchase ID is required'
        }
      });
    }

    const supabase = getSupabaseClient();
    console.log('✅ Supabase client initialized');

    // Validate purchase exists
    console.log('🔍 Looking for purchase with ID:', purchaseId);
    const purchase = await guestCoursePurchaseService.getGuestCoursePurchaseById(supabase, purchaseId);
    
    console.log('📋 Purchase found:', purchase ? 'YES' : 'NO');
    
    if (!purchase) {
      console.error('❌ Purchase not found for ID:', purchaseId);
      return res.status(404).json({
        success: false,
        error: {
          code: 'PURCHASE_NOT_FOUND',
          message: 'Course purchase not found'
        }
      });
    }

    console.log('✅ Purchase validated, course price:', purchase.course_price, 'requested amount:', amount);

    // Validate amount matches purchase
    if (purchase.course_price !== amount) {
      console.error('❌ Amount mismatch:', purchase.course_price, 'vs', amount);
      return res.status(400).json({
        success: false,
        error: {
          code: 'AMOUNT_MISMATCH',
          message: 'Payment amount does not match course price'
        }
      });
    }

    console.log('✅ Amount validation passed');

    const intentId = `sq_int_${uuidv4()}`;

    res.status(200).json({
      success: true,
      data: {
        client_secret: null,
        payment_intent_id: intentId,
        amount: amount,
        currency: currency.toUpperCase(),
        payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      message: 'Course payment intent created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating guest course payment intent:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: error.message
      }
    });
  }
};

module.exports = {
  createCoursePaymentIntent,
  createMentorshipPaymentIntent,
  createGuestBookingPaymentIntent,
  createGuestCoursePaymentIntent,
  confirmGuestBookingPayment,
  confirmPayment,
  getPaymentHistory,
  getPaymentStats,
};

