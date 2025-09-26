const { getSupabaseClient } = require('../utils/supabaseClient');

const dashboardController = {
  // GET /
  getDashboardStats: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();

      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      
      if (usersError) {
        console.error('Error fetching users count:', usersError);
      }

      // Get total courses count
      const { count: totalCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      if (coursesError) {
        console.error('Error fetching courses count:', coursesError);
      }

      // Get total enrollments count (regular enrollments)
      const { count: totalEnrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      if (enrollmentsError) {
        console.error('Error fetching enrollments count:', enrollmentsError);
      }

      // Get guest enrollments count (from guest course purchases)
      const { count: guestEnrollments, error: guestEnrollmentsError } = await supabase
        .from('guest_course_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'PAID');

      if (guestEnrollmentsError) {
        console.error('Error fetching guest enrollments count:', guestEnrollmentsError);
      }

      // Get total mentorship bookings count (regular bookings)
      const { count: totalMentorshipBookings, error: mentorshipError } = await supabase
        .from('mentorship_bookings')
        .select('*', { count: 'exact', head: true });

      if (mentorshipError) {
        console.error('Error fetching mentorship bookings count:', mentorshipError);
      }

      // Get guest bookings count
      const { count: guestBookings, error: guestBookingsError } = await supabase
        .from('guest_bookings')
        .select('*', { count: 'exact', head: true });

      if (guestBookingsError) {
        console.error('Error fetching guest bookings count:', guestBookingsError);
      }

      // Get pending assignments count (assignments without submissions or ungraded submissions)
      const { data: assignmentsWithSubmissions, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          assignment_id,
          submissions!left(
            submission_id,
            grade
          )
        `);

      let pendingAssignments = 0;
      if (!assignmentsError && assignmentsWithSubmissions) {
        // Count assignments that either have no submissions or have ungraded submissions
        pendingAssignments = assignmentsWithSubmissions.filter(assignment => {
          return assignment.submissions.length === 0 || 
                 assignment.submissions.some(submission => submission.grade === null);
        }).length;
      }

      if (assignmentsError) {
        console.error('Error fetching pending assignments count:', assignmentsError);
      }

      // Get total revenue from guest course purchases
      const { data: guestPurchases, error: guestPurchasesError } = await supabase
        .from('guest_course_purchases')
        .select('course_price')
        .eq('payment_status', 'PAID');

      let totalRevenue = 0;
      if (!guestPurchasesError && guestPurchases) {
        totalRevenue = guestPurchases.reduce((sum, purchase) => sum + (purchase.course_price || 0), 0);
      }

      // Add revenue from regular course enrollments via payments table
      const { data: coursePayments, error: coursePaymentsError } = await supabase
        .from('payments')
        .select('amount')
        .not('course_id', 'is', null)
        .eq('status', 'completed');

      if (!coursePaymentsError && coursePayments) {
        totalRevenue += coursePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      }

      // Add revenue from regular mentorship bookings via payments table
      const { data: mentorshipPayments, error: mentorshipPaymentsError } = await supabase
        .from('payments')
        .select('amount')
        .not('mentorship_slot_id', 'is', null)
        .eq('status', 'completed');

      if (!mentorshipPaymentsError && mentorshipPayments) {
        totalRevenue += mentorshipPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      }

      // Add revenue from guest mentorship bookings
      const { data: guestMentorshipPayments, error: guestMentorshipPaymentsError } = await supabase
        .from('guest_bookings')
        .select('session_price')
        .eq('payment_status', 'PAID');

      if (!guestMentorshipPaymentsError && guestMentorshipPayments) {
        totalRevenue += guestMentorshipPayments.reduce((sum, booking) => sum + (booking.session_price || 0), 0);
      }

      if (guestPurchasesError) {
        console.error('Error fetching guest purchases revenue:', guestPurchasesError);
      }
      if (coursePaymentsError) {
        console.error('Error fetching course payments revenue:', coursePaymentsError);
      }
      if (mentorshipPaymentsError) {
        console.error('Error fetching mentorship payments revenue:', mentorshipPaymentsError);
      }
      if (guestMentorshipPaymentsError) {
        console.error('Error fetching guest mentorship payments revenue:', guestMentorshipPaymentsError);
      }

      const stats = {
        totalUsers: totalUsers || 0,
        totalCourses: totalCourses || 0,
        totalEnrollments: (totalEnrollments || 0) + (guestEnrollments || 0),
        totalMentorshipBookings: (totalMentorshipBookings || 0) + (guestBookings || 0),
        pendingAssignments: pendingAssignments || 0,
        totalRevenue: totalRevenue
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Dashboard stats retrieved successfully'
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      next(error);
    }
  },

  // GET /api/dashboard/recent-enrollments
  getRecentEnrollments: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { limit = 5 } = req.query;

      // Get recent regular enrollments
      const { data: regularEnrollments, error: regularError } = await supabase
        .from('enrollments')
        .select(`
          enrollment_id,
          user_id,
          course_id,
          requested_at,
          status,
          users!inner(user_id, first_name, last_name, email),
          courses!inner(course_id, title, thumbnail_url)
        `)
        .order('requested_at', { ascending: false })
        .limit(limit);

      // Get recent guest enrollments
      const { data: guestEnrollments, error: guestError } = await supabase
        .from('guest_course_purchases')
        .select(`
          purchase_id,
          customer_name,
          customer_email,
          course_id,
          created_at,
          payment_status,
          courses!inner(course_id, title, thumbnail_url)
        `)
        .eq('payment_status', 'PAID')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (regularError) {
        console.error('Error fetching regular enrollments:', regularError);
      }
      if (guestError) {
        console.error('Error fetching guest enrollments:', guestError);
      }

      // Format regular enrollments
      const formattedRegularEnrollments = (regularEnrollments || []).map(enrollment => ({
        enrollment_id: enrollment.enrollment_id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        enrollment_date: enrollment.requested_at,
        progress: 0, // Default progress since not in schema
        status: enrollment.status,
        user: {
          user_id: enrollment.users.user_id,
          first_name: enrollment.users.first_name,
          last_name: enrollment.users.last_name,
          email: enrollment.users.email
        },
        course: {
          course_id: enrollment.courses.course_id,
          title: enrollment.courses.title,
          thumbnail_url: enrollment.courses.thumbnail_url
        },
        // Computed properties for compatibility
        userName: `${enrollment.users.first_name} ${enrollment.users.last_name}`,
        courseTitle: enrollment.courses.title,
        isGuest: false
      }));

      // Format guest enrollments
      const formattedGuestEnrollments = (guestEnrollments || []).map(enrollment => ({
        enrollment_id: enrollment.purchase_id,
        user_id: null,
        course_id: enrollment.course_id,
        enrollment_date: enrollment.created_at,
        progress: 0,
        status: 'active',
        user: {
          user_id: null,
          first_name: enrollment.customer_name.split(' ')[0] || enrollment.customer_name,
          last_name: enrollment.customer_name.split(' ').slice(1).join(' ') || '',
          email: enrollment.customer_email
        },
        course: {
          course_id: enrollment.courses.course_id,
          title: enrollment.courses.title,
          thumbnail_url: enrollment.courses.thumbnail_url
        },
        // Computed properties for compatibility
        userName: `${enrollment.customer_name} (Guest)`,
        courseTitle: enrollment.courses.title,
        isGuest: true
      }));

      // Combine and sort all enrollments by date
      const allEnrollments = [...formattedRegularEnrollments, ...formattedGuestEnrollments]
        .sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date))
        .slice(0, limit);

      res.status(200).json({
        success: true,
        data: allEnrollments,
        message: 'Recent enrollments retrieved successfully'
      });
    } catch (error) {
      console.error('Recent enrollments error:', error);
      next(error);
    }
  },

  // GET /api/dashboard/revenue
  getRevenueOverview: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { months = 6 } = req.query;

      // Get revenue data for the last N months
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - months);

      // Get guest course purchases revenue by month
      const { data: guestPurchases, error: guestError } = await supabase
        .from('guest_course_purchases')
        .select('course_price, created_at')
        .eq('payment_status', 'completed')
        .gte('created_at', monthsAgo.toISOString());

      // Get course payments revenue by month
      const { data: coursePayments, error: courseError } = await supabase
        .from('payments')
        .select('amount, created_at')
        .not('course_id', 'is', null)
        .eq('status', 'completed')
        .gte('created_at', monthsAgo.toISOString());

      // Get mentorship payments revenue by month
      const { data: mentorshipPayments, error: mentorshipError } = await supabase
        .from('payments')
        .select('amount, created_at')
        .not('mentorship_slot_id', 'is', null)
        .eq('status', 'completed')
        .gte('created_at', monthsAgo.toISOString());

      // Get guest mentorship bookings revenue by month
      const { data: guestBookings, error: guestBookingsError } = await supabase
        .from('guest_bookings')
        .select('session_price, created_at')
        .eq('payment_status', 'PAID')
        .gte('created_at', monthsAgo.toISOString());

      // Process revenue data by month
      const revenueByMonth = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Initialize months
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        revenueByMonth[monthKey] = 0;
      }

      // Add guest purchases revenue
      if (!guestError && guestPurchases) {
        guestPurchases.forEach(purchase => {
          const date = new Date(purchase.created_at);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          if (revenueByMonth.hasOwnProperty(monthKey)) {
            revenueByMonth[monthKey] += purchase.course_price || 0;
          }
        });
      }

      // Add course payments revenue
      if (!courseError && coursePayments) {
        coursePayments.forEach(payment => {
          const date = new Date(payment.created_at);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          if (revenueByMonth.hasOwnProperty(monthKey)) {
            revenueByMonth[monthKey] += payment.amount || 0;
          }
        });
      }

      // Add mentorship payments revenue
      if (!mentorshipError && mentorshipPayments) {
        mentorshipPayments.forEach(payment => {
          const date = new Date(payment.created_at);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          if (revenueByMonth.hasOwnProperty(monthKey)) {
            revenueByMonth[monthKey] += payment.amount || 0;
          }
        });
      }

      // Add guest mentorship bookings revenue
      if (!guestBookingsError && guestBookings) {
        guestBookings.forEach(booking => {
          const date = new Date(booking.created_at);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          if (revenueByMonth.hasOwnProperty(monthKey)) {
            revenueByMonth[monthKey] += booking.session_price || 0;
          }
        });
      }

      // Log errors if any
      if (guestError) {
        console.error('Error fetching guest purchases for revenue overview:', guestError);
      }
      if (courseError) {
        console.error('Error fetching course payments for revenue overview:', courseError);
      }
      if (mentorshipError) {
        console.error('Error fetching mentorship payments for revenue overview:', mentorshipError);
      }
      if (guestBookingsError) {
        console.error('Error fetching guest bookings for revenue overview:', guestBookingsError);
      }

      // Convert to array format expected by frontend
      const revenueData = Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month: month.split(' ')[0], revenue }))
        .reverse(); // Most recent first

      res.status(200).json({
        success: true,
        data: revenueData,
        message: 'Revenue overview retrieved successfully'
      });
    } catch (error) {
      console.error('Revenue overview error:', error);
      next(error);
    }
  },

  // GET /api/dashboard/upcoming-mentorship
  getUpcomingMentorshipSessions: async (req, res, next) => {
    try {
      const supabase = getSupabaseClient();
      const { limit = 5 } = req.query;
      const now = new Date().toISOString();

      // Get upcoming regular mentorship bookings
      const { data: regularBookings, error: regularError } = await supabase
        .from('mentorship_bookings')
        .select(`
          booking_id,
          user_id,
          slot_id,
          payment_status,
          zoom_link,
          booked_at,
          created_at,
          users!inner(user_id, first_name, last_name, email),
          mentorship_slots!inner(
            slot_id,
            start_time,
            end_time,
            mentor:users!mentorship_slots_mentor_user_id_fkey(user_id, first_name, last_name, email)
          )
        `)
        .gte('mentorship_slots.start_time', now)
        .eq('payment_status', 'PAID')
        .order('mentorship_slots(start_time)', { ascending: true })
        .limit(limit);

      // Get upcoming guest mentorship bookings
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
          instructors!inner(instructor_id, first_name, last_name, email)
        `)
        .gte('preferred_date', now.split('T')[0])
        .eq('payment_status', 'PAID')
        .order('preferred_date', { ascending: true })
        .order('preferred_time', { ascending: true })
        .limit(limit);

      if (regularError) {
        console.error('Error fetching regular mentorship bookings:', regularError);
      }
      if (guestError) {
        console.error('Error fetching guest mentorship bookings:', guestError);
      }

      // Format regular bookings
      const formattedRegularBookings = (regularBookings || []).map(booking => ({
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
          first_name: booking.users.first_name,
          last_name: booking.users.last_name,
          email: booking.users.email
        },
        mentor: {
          mentor_id: booking.mentorship_slots.mentor.user_id,
          first_name: booking.mentorship_slots.mentor.first_name,
          last_name: booking.mentorship_slots.mentor.last_name,
          email: booking.mentorship_slots.mentor.email
        },
        // Computed properties for compatibility
        userName: `${booking.users.first_name} ${booking.users.last_name}`,
        mentorName: `${booking.mentorship_slots.mentor.first_name} ${booking.mentorship_slots.mentor.last_name}`,
        isGuest: false
      }));

      // Format guest bookings
      const formattedGuestBookings = (guestBookings || []).map(booking => ({
        booking_id: booking.guest_booking_id,
        user_id: null,
        mentor_id: booking.instructor_id,
        slot_id: null,
        date: booking.preferred_date,
        time_slot: booking.preferred_time,
        status: 'confirmed', // Guest bookings are confirmed when paid
        payment_status: booking.payment_status === 'PAID' ? 'completed' : 'pending',
        zoom_link: booking.meeting_link,
        created_at: booking.created_at,
        user: {
          user_id: null,
          first_name: booking.customer_name.split(' ')[0] || booking.customer_name,
          last_name: booking.customer_name.split(' ').slice(1).join(' ') || '',
          email: booking.customer_email
        },
        mentor: {
          mentor_id: booking.instructors.instructor_id,
          first_name: booking.instructors.first_name,
          last_name: booking.instructors.last_name,
          email: booking.instructors.email
        },
        // Computed properties for compatibility
        userName: `${booking.customer_name} (Guest)`,
        mentorName: `${booking.instructors.first_name} ${booking.instructors.last_name}`,
        isGuest: true
      }));

      // Combine and sort all bookings by date and time
      const allBookings = [...formattedRegularBookings, ...formattedGuestBookings]
        .sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time_slot}`);
          const dateB = new Date(`${b.date} ${b.time_slot}`);
          return dateA - dateB;
        })
        .slice(0, limit);

      res.status(200).json({
        success: true,
        data: allBookings,
        message: 'Upcoming mentorship sessions retrieved successfully'
      });
    } catch (error) {
      console.error('Upcoming mentorship sessions error:', error);
      next(error);
    }
  }
};

module.exports = dashboardController;