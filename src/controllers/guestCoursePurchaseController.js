const { getSupabaseClient } = require('../utils/supabaseClient');
const guestCoursePurchaseService = require('../services/guestCoursePurchaseService');
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const stripeService = require('../services/stripeService');
const { body, validationResult } = require('express-validator');

/**
 * Create a guest course purchase (redirects to checkout)
 */
const createGuestCoursePurchase = async (req, res) => {
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
      courseId,
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    // Get course details to get the price
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        course_id,
        title,
        description,
        price,
        instructor:instructors(
          instructor_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('course_id', courseId)
      .eq('is_published', true)
      .single();

    if (courseError || !course) {
      console.error('Error fetching course:', courseError);
      return res.status(404).json({
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found or not published'
        }
      });
    }

    // Check if user exists and is blocked
    const { data: existingUser } = await supabase
      .from('users')
      .select('is_active')
      .eq('email', customerEmail)
      .single();

    if (existingUser && !existingUser.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_BLOCKED',
          message: 'Your account has been blocked. Please contact support.'
        }
      });
    }

    // Create guest course purchase
    const purchaseData = {
      courseId,
      customerName,
      customerEmail,
      customerPhone,
      coursePrice: course.price || 0
    };

    const purchase = await guestCoursePurchaseService.createGuestCoursePurchase(supabase, purchaseData);

    // Return purchase details for checkout
    res.status(201).json({
      success: true,
      data: {
        purchase_id: purchase.purchase_id,
        course_id: courseId,
        course_title: course.title,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        course_price: course.price,
        payment_status: purchase.payment_status,
        checkout_url: `/course-checkout/${purchase.purchase_id}` // Frontend checkout URL
      },
      message: 'Guest course purchase created successfully. Redirecting to checkout...'
    });
  } catch (error) {
    console.error('Error creating guest course purchase:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create guest course purchase'
      }
    });
  }
};

/**
 * Create payment intent for guest course purchase
 */
const createPaymentIntent = async (req, res) => {
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
    const { purchaseId } = req.body;

    // Get purchase details
    const purchase = await guestCoursePurchaseService.getGuestCoursePurchaseById(supabase, purchaseId);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PURCHASE_NOT_FOUND',
          message: 'Purchase not found'
        }
      });
    }

    // Check if payment is already completed
    if (purchase.payment_status === 'PAID') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_ALREADY_COMPLETED',
          message: 'Payment has already been completed for this purchase'
        }
      });
    }

    // Create Stripe payment intent
    const paymentIntentResult = await stripeService.createPaymentIntent({
      amount: purchase.course_price,
      currency: 'usd',
      customerEmail: purchase.customer_email,
      courseTitle: purchase.course_title,
      purchaseId: purchase.purchase_id
    });

    if (!paymentIntentResult.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENT_CREATION_FAILED',
          message: paymentIntentResult.error.message
        }
      });
    }

    // Update purchase with payment intent ID
    await guestCoursePurchaseService.updatePaymentIntentId(
      supabase,
      purchaseId,
      paymentIntentResult.data.payment_intent_id
    );

    res.status(200).json({
      success: true,
      data: {
        client_secret: paymentIntentResult.data.client_secret,
        payment_intent_id: paymentIntentResult.data.payment_intent_id,
        amount: paymentIntentResult.data.amount,
        currency: paymentIntentResult.data.currency,
        purchase_id: purchaseId
      },
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create payment intent'
      }
    });
  }
};

/**
 * Get guest course purchase by ID (for checkout page)
 */
const getGuestCoursePurchaseById = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { purchaseId } = req.params;
    
    const purchase = await guestCoursePurchaseService.getGuestCoursePurchaseById(supabase, purchaseId);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Guest course purchase not found'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: purchase,
      message: 'Guest course purchase retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching guest course purchase:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch guest course purchase'
      }
    });
  }
};

/**
 * Update payment status for guest course purchase
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { purchaseId } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;
    
    const purchase = await guestCoursePurchaseService.updatePaymentStatus(
      supabase, 
      purchaseId, 
      paymentStatus,
      paymentMethod,
      transactionId
    );

    // Send confirmation email if payment is successful
    if (paymentStatus === 'PAID') {
      try {
        // Unlock all courses in the same series
        console.log(`💳 PAYMENT CONFIRMED: Triggering series unlock for course ${purchase.course_id}, customer ${purchase.customer_email}`);
        try {
          await guestCoursePurchaseService.unlockSeriesCourses(
            supabase, 
            purchase.customer_email, 
            purchase.course_id
          );
          console.log(`✅ SERIES UNLOCK: Successfully completed for course ${purchase.course_id}`);
        } catch (seriesError) {
          console.error('❌ SERIES UNLOCK: Error unlocking series courses:', seriesError);
          // Continue with the rest of the process even if series unlocking fails
        }

        // Create user account from guest purchase
        let userAccount = null;
        let isNewUser = false;
        try {
          userAccount = await userService.createUserFromGuestPurchase(supabase, {
            customer_name: purchase.customer_name,
            customer_email: purchase.customer_email,
            customer_phone: purchase.customer_phone
          });
          
          // Check if this is a new user (has plainPassword) or existing user
          isNewUser = userAccount.plainPassword ? true : false;
          console.log(`User account ${isNewUser ? 'created' : 'retrieved'} for guest purchase:`, userAccount.email);
        } catch (userError) {
          console.error('Error creating user account from guest purchase:', userError);
          // Continue with email sending even if user creation fails
        }

        // Only send course confirmation email for NEW users
        if (isNewUser) {
          await emailService.sendCoursePurchaseConfirmation({
            customerName: purchase.customer_name,
            customerEmail: purchase.customer_email,
            courseTitle: purchase.course.title,
            coursePrice: purchase.course_price,
            accessCode: purchase.access_code,
            instructorName: purchase.course.instructor ? `${purchase.course.instructor.first_name} ${purchase.course.instructor.last_name}` : 'Course Instructor'
          });
        } else {
          console.log('Existing user purchase - course unlocked without additional emails');
        }

        // Send user credentials email ONLY for NEW users
        if (userAccount && userAccount.plainPassword) {
          try {
            await emailService.sendUserCredentialsEmail(userAccount, purchase.course.title, purchase.access_code);
            console.log('User credentials email sent to:', userAccount.email);
          } catch (credentialsEmailError) {
            console.error('Error sending user credentials email:', credentialsEmailError);
          }
        }

        // Send notification email to instructor (always)
        if (purchase.course.instructor) {
          await emailService.sendInstructorCoursePurchaseNotification(purchase.course.instructor.email, {
            customerName: purchase.customer_name,
            customerEmail: purchase.customer_email,
            courseTitle: purchase.course.title,
            coursePrice: purchase.course_price
          });
        }
      } catch (emailError) {
        console.error('Error sending confirmation emails:', emailError);
        // Don't fail the payment update if email fails
      }
    }
    
    res.status(200).json({
      success: true,
      data: purchase,
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
 * Get all guest course purchases (admin only)
 */
const getAllGuestCoursePurchases = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { courseId, paymentStatus } = req.query;
    
    const purchases = await guestCoursePurchaseService.getAllGuestCoursePurchases(
      supabase, 
      courseId, 
      paymentStatus
    );
    
    res.status(200).json({
      success: true,
      data: purchases,
      message: 'Guest course purchases retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching guest course purchases:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch guest course purchases'
      }
    });
  }
};

/**
 * Get guest course purchase by access code (for course access)
 */
const getGuestCoursePurchaseByAccessCode = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { accessCode } = req.params;
    
    const purchase = await guestCoursePurchaseService.getGuestCoursePurchaseByAccessCode(supabase, accessCode);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid access code or purchase not found'
        }
      });
    }

    // Check if payment is completed
    if (purchase.payment_status !== 'PAID') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Payment required to access course'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: purchase,
      message: 'Course access granted'
    });
  } catch (error) {
    console.error('Error fetching guest course purchase by access code:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify course access'
      }
    });
  }
};

/**
 * Delete guest course purchase (admin only)
 */
const deleteGuestCoursePurchase = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { purchaseId } = req.params;
    
    await guestCoursePurchaseService.deleteGuestCoursePurchase(supabase, purchaseId);
    
    res.status(200).json({
      success: true,
      message: 'Guest course purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guest course purchase:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete guest course purchase'
      }
    });
  }
};

/**
 * Get purchase statistics (admin only)
 */
const getPurchaseStats = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    const stats = await guestCoursePurchaseService.getPurchaseStats(supabase);
    
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Purchase statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching purchase stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch purchase statistics'
      }
    });
  }
};

/**
 * Get purchased courses by email (public endpoint) - DEPRECATED: Security risk
 * @deprecated Use getMyPurchasedCourses instead
 */
const getPurchasedCoursesByEmail = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { email } = req.params;
    
    const purchasedCourses = await guestCoursePurchaseService.getPurchasedCoursesByEmail(supabase, email);
    
    res.status(200).json({
      success: true,
      data: purchasedCourses,
      message: 'Purchased courses retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching purchased courses by email:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch purchased courses'
      }
    });
  }
};

/**
 * Get purchased courses for authenticated user (secure endpoint)
 */
const getMyPurchasedCourses = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const userEmail = req.user.email; // Get email from authenticated user
    
    const purchasedCourses = await guestCoursePurchaseService.getPurchasedCoursesByEmail(supabase, userEmail);
    
    res.status(200).json({
      success: true,
      data: purchasedCourses,
      message: 'Your purchased courses retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching user purchased courses:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch your purchased courses'
      }
    });
  }
};

/**
 * Send credentials for guest course purchase (admin only)
 */
const sendCredentials = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { purchaseId } = req.params;
    
    // Get purchase details
    const purchase = await guestCoursePurchaseService.getGuestCoursePurchaseById(supabase, purchaseId);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Guest course purchase not found'
        }
      });
    }

    // Create or get user account from guest purchase
    let userAccount = null;
    let isNewUser = false;
    try {
      userAccount = await userService.createUserFromGuestPurchase(supabase, {
        customer_name: purchase.customer_name,
        customer_email: purchase.customer_email,
        customer_phone: purchase.customer_phone
      });
      
      // Check if this is a new user (has plainPassword) or existing user
      isNewUser = userAccount.plainPassword ? true : false;
      console.log(`User account ${isNewUser ? 'created' : 'retrieved'} for guest purchase:`, userAccount.email);
      
      // If existing user, generate new credentials for resend
      if (!isNewUser) {
        console.log('Generating new credentials for existing user');
        userAccount = await userService.generateCredentialsForExistingUser(supabase, purchase.customer_email);
        isNewUser = false; // Keep as false since it's still an existing user
      }
    } catch (userError) {
      console.error('Error creating/updating user account from guest purchase:', userError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: 'Failed to create/update user account'
        }
      });
    }

    // Send user credentials email (always send, whether new or existing user)
    try {
      await emailService.sendUserCredentialsEmail(userAccount, purchase.course.title, purchase.access_code);
      console.log('User credentials email sent to:', userAccount.email);
    } catch (emailError) {
      console.error('Error sending user credentials email:', emailError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send credentials email'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Credentials sent successfully',
      data: {
        user_email: userAccount.email,
        username: userAccount.username,
        is_new_user: isNewUser,
        credentials_regenerated: !isNewUser
      }
    });
  } catch (error) {
    console.error('Error sending credentials:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send credentials'
      }
    });
  }
};

module.exports = {
  createGuestCoursePurchase,
  createPaymentIntent,
  getGuestCoursePurchaseById,
  updatePaymentStatus,
  getAllGuestCoursePurchases,
  getGuestCoursePurchaseByAccessCode,
  getPurchasedCoursesByEmail,
  getMyPurchasedCourses,
  deleteGuestCoursePurchase,
  getPurchaseStats,
  sendCredentials
};