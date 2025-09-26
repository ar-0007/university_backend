const { v4: uuidv4 } = require('uuid');

class GuestCoursePurchaseService {
  /**
   * Create a guest course purchase
   */
  async createGuestCoursePurchase(supabase, purchaseData) {
    try {
      const {
        courseId,
        customerName,
        customerEmail,
        customerPhone,
        coursePrice
      } = purchaseData;

      // Generate unique access code
      const accessCode = this.generateAccessCode();

      const { data, error } = await supabase
        .from('guest_course_purchases')
        .insert({
          course_id: courseId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          course_price: coursePrice,
          access_code: accessCode,
          payment_status: 'PENDING'
        })
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error creating guest course purchase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createGuestCoursePurchase:', error);
      throw error;
    }
  }

  /**
   * Get all guest course purchases (admin only)
   */
  async getAllGuestCoursePurchases(supabase, courseId = null, paymentStatus = null) {
    try {
      let query = supabase
        .from('guest_course_purchases')
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching guest course purchases:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getAllGuestCoursePurchases:', error);
      throw error;
    }
  }

  /**
   * Get guest course purchase by ID
   */
  async getGuestCoursePurchaseById(supabase, purchaseId) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('purchase_id', purchaseId)
        .single();

      if (error) {
        console.error('Error fetching guest course purchase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getGuestCoursePurchaseById:', error);
      throw error;
    }
  }

  /**
   * Get guest course purchase by access code
   */
  async getGuestCoursePurchaseByAccessCode(supabase, accessCode) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('access_code', accessCode)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching guest course purchase by access code:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getGuestCoursePurchaseByAccessCode:', error);
      throw error;
    }
  }

  /**
   * Get purchased courses by customer email
   */
  async getPurchasedCoursesByEmail(supabase, customerEmail) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            duration_hours,
            level,
            video_series,
            video_part,
            intro_video_url,
            created_at,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
              
          )
        `)
        .eq('customer_email', customerEmail)
        .eq('payment_status', 'PAID')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchased courses by email:', error);
        throw error;
      }

      // Return only the course data with purchase info
      return data.map(purchase => ({
        ...purchase.course,
        purchase_id: purchase.purchase_id,
        access_code: purchase.access_code,
        purchased_at: purchase.created_at,
        is_purchased: true
      }));
    } catch (error) {
      console.error('Error in getPurchasedCoursesByEmail:', error);
      throw error;
    }
  }

  /**
   * Update payment status for guest course purchase
   */
  async updatePaymentStatus(supabase, purchaseId, paymentStatus, paymentMethod = null, transactionId = null) {
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

      const { data, error } = await supabase
        .from('guest_course_purchases')
        .update(updateData)
        .eq('purchase_id', purchaseId)
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }

      // If payment is completed, unlock all chapters for the user and series courses
      if (paymentStatus === 'PAID' && data) {
        try {
          const userChapterAccessService = require('./userChapterAccessService');
          
          // Get or create user account for guest purchase
          const { data: userData } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', data.customer_email)
            .single();

          if (userData) {
            await userChapterAccessService.unlockAllChaptersForCourse(
              supabase, 
              userData.user_id, 
              data.course_id
            );
            console.log(`✅ All chapters unlocked for user ${userData.user_id} in course ${data.course_id}`);
          } else {
            console.log(`⚠️ User account not found for email ${data.customer_email}, chapters will be unlocked when account is created`);
          }
        } catch (chapterError) {
          console.error('Error unlocking chapters after payment completion:', chapterError);
          // Don't throw error here as payment update was successful
        }

        // Unlock all courses in the same series
        try {
          await this.unlockSeriesCourses(supabase, data.customer_email, data.course_id);
        } catch (seriesError) {
          console.error('Error unlocking series courses:', seriesError);
          // Don't throw error here as payment update was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
      throw error;
    }
  }

  /**
   * Unlock all courses in the same series for a user
   */
  async unlockSeriesCourses(supabase, customerEmail, purchasedCourseId) {
    try {
      console.log(`🔓 SERIES UNLOCK: Starting for course ${purchasedCourseId} and customer ${customerEmail}`);
      
      // Get the purchased course details to find its series
      const { data: purchasedCourse, error: courseError } = await supabase
        .from('courses')
        .select('video_series, title')
        .eq('course_id', purchasedCourseId)
        .single();

      if (courseError || !purchasedCourse) {
        console.error('❌ SERIES UNLOCK: Error fetching purchased course:', courseError);
        return;
      }

      console.log(`🔍 SERIES UNLOCK: Purchased course details:`, {
        title: purchasedCourse.title,
        video_series: purchasedCourse.video_series
      });

      // If the course doesn't belong to a series, no need to unlock others
      if (!purchasedCourse.video_series || !purchasedCourse.video_series.trim()) {
        console.log('⚠️ SERIES UNLOCK: Course does not belong to a series, no additional unlocking needed');
        return;
      }

      const seriesName = purchasedCourse.video_series.trim();
      console.log(`🎯 SERIES UNLOCK: Course belongs to series: "${seriesName}"`);

      // Get all courses in the same series
      const { data: seriesCourses, error: seriesError } = await supabase
        .from('courses')
        .select('course_id, title, price')
        .eq('video_series', seriesName)
        .eq('is_published', true)
        .neq('course_id', purchasedCourseId); // Exclude the already purchased course

      if (seriesError) {
        console.error('❌ SERIES UNLOCK: Error fetching series courses:', seriesError);
        return;
      }

      console.log(`📚 SERIES UNLOCK: Found ${seriesCourses?.length || 0} other courses in series:`, 
        seriesCourses?.map(c => c.title) || []);

      if (!seriesCourses || seriesCourses.length === 0) {
        console.log('⚠️ SERIES UNLOCK: No other courses found in this series');
        return;
      }

      // Create guest course purchases for all other courses in the series
      const unlockPromises = seriesCourses.map(async (course) => {
        console.log(`🔍 SERIES UNLOCK: Checking if customer already owns: ${course.title}`);
        
        // Check if user already has access to this course
        const { data: existingPurchase } = await supabase
          .from('guest_course_purchases')
          .select('purchase_id')
          .eq('customer_email', customerEmail)
          .eq('course_id', course.course_id)
          .eq('payment_status', 'PAID')
          .single();

        if (existingPurchase) {
          console.log(`✅ SERIES UNLOCK: User already has access to course: ${course.title}`);
          return null;
        }

        console.log(`🔍 SERIES UNLOCK: Getting original purchase details for customer`);
        
        // Get customer details from the original purchase
        const { data: originalPurchases } = await supabase
          .from('guest_course_purchases')
          .select('customer_name, customer_phone')
          .eq('customer_email', customerEmail)
          .eq('course_id', purchasedCourseId)
          .eq('payment_status', 'PAID')
          .order('created_at', { ascending: false });

        const originalPurchase = originalPurchases?.[0];
        if (!originalPurchase) {
          console.error('❌ SERIES UNLOCK: Could not find original purchase details');
          return null;
        }

        console.log(`🆓 SERIES UNLOCK: Creating free purchase for: ${course.title}`);
        
        // Create a new purchase record with PAID status (series unlock)
        const accessCode = this.generateAccessCode();
        const { data: newPurchase, error: insertError } = await supabase
          .from('guest_course_purchases')
          .insert({
            course_id: course.course_id,
            customer_name: originalPurchase.customer_name,
            customer_email: customerEmail,
            customer_phone: originalPurchase.customer_phone,
            course_price: 0, // Free unlock due to series purchase
            access_code: accessCode,
            payment_status: 'PAID',
            payment_method: 'SERIES_UNLOCK',
            transaction_id: `series_unlock_${Date.now()}_${course.course_id}`
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ SERIES UNLOCK: Error unlocking course ${course.title}:`, insertError);
          return null;
        }

        console.log(`🎉 SERIES UNLOCK: Successfully unlocked course: ${course.title}`);
        
        // Unlock chapters for this series course
        try {
          const userChapterAccessService = require('./userChapterAccessService');
          
          // Get or create user account for guest purchase
          const { data: userData } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', customerEmail)
            .single();

          if (userData) {
            await userChapterAccessService.unlockAllChaptersForCourse(
              supabase, 
              userData.user_id, 
              course.course_id
            );
            console.log(`✅ SERIES UNLOCK: All chapters unlocked for user ${userData.user_id} in course ${course.course_id}`);
          } else {
            console.log(`⚠️ SERIES UNLOCK: User account not found for email ${customerEmail}, chapters will be unlocked when account is created`);
          }
        } catch (chapterError) {
          console.error(`❌ SERIES UNLOCK: Error unlocking chapters for course ${course.title}:`, chapterError);
          // Don't fail the series unlock if chapter unlocking fails
        }
        
        return newPurchase;
      });

      const results = await Promise.all(unlockPromises);
      const successfulUnlocks = results.filter(result => result !== null);
      
      console.log(`🏁 SERIES UNLOCK COMPLETED: ${successfulUnlocks.length} courses unlocked in series: ${seriesName}`);
      return successfulUnlocks;
      
    } catch (error) {
      console.error('❌ SERIES UNLOCK: Error in unlockSeriesCourses:', error);
      throw error;
    }
  }

  /**
   * Update payment intent ID for guest course purchase
   */
  async updatePaymentIntentId(supabase, purchaseId, paymentIntentId) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .update({
          payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString()
        })
        .eq('purchase_id', purchaseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment intent ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updatePaymentIntentId:', error);
      throw error;
    }
  }

  /**
   * Update guest course purchase
   */
  async updateGuestCoursePurchase(supabase, purchaseId, updateData) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('purchase_id', purchaseId)
        .select(`
          *,
          course:courses(
            course_id,
            title,
            description,
            thumbnail_url,
            price,
            instructor:instructors(
              instructor_id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error updating guest course purchase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateGuestCoursePurchase:', error);
      throw error;
    }
  }

  /**
   * Delete guest course purchase
   */
  async deleteGuestCoursePurchase(supabase, purchaseId) {
    try {
      const { error } = await supabase
        .from('guest_course_purchases')
        .delete()
        .eq('purchase_id', purchaseId);

      if (error) {
        console.error('Error deleting guest course purchase:', error);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteGuestCoursePurchase:', error);
      throw error;
    }
  }

  /**
   * Generate unique access code for course access
   */
  generateAccessCode() {
    // Generate a 12-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get purchase statistics
   */
  async getPurchaseStats(supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_course_purchases')
        .select('payment_status, course_price');

      if (error) {
        console.error('Error fetching purchase stats:', error);
        throw error;
      }

      const stats = {
        totalPurchases: data.length,
        pendingPurchases: data.filter(p => p.payment_status === 'PENDING').length,
        paidPurchases: data.filter(p => p.payment_status === 'PAID').length,
        failedPurchases: data.filter(p => p.payment_status === 'FAILED').length,
        totalRevenue: data
          .filter(p => p.payment_status === 'PAID')
          .reduce((sum, p) => sum + parseFloat(p.course_price), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error in getPurchaseStats:', error);
      throw error;
    }
  }
}

module.exports = new GuestCoursePurchaseService();