const express = require('express');
const { getSupabaseClient } = require('../../utils/supabaseClient');
const courseService = require('../../services/courseService');
const { authenticateToken } = require('../../middleware/restAuthMiddleware');

const router = express.Router();
const supabase = getSupabaseClient();

/**
 * POST /api/admin/series-unlock/comprehensive-check
 * Manually trigger comprehensive series unlock check for all customers
 * This will ensure all customers who have purchased any part of a series
 * get access to all other parts of that series
 */
router.post('/comprehensive-check', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Admin triggered comprehensive series unlock check');
    
    const result = await courseService.checkAndUnlockAllSeriesParts(supabase);
    
    console.log('📊 Comprehensive unlock completed:', result);
    
    res.json({
      success: true,
      message: 'Comprehensive series unlock check completed successfully',
      data: {
        customersProcessed: result.totalProcessed,
        coursesUnlocked: result.totalUnlocked,
        details: result.details || []
      }
    });
    
  } catch (error) {
    console.error('❌ Error in comprehensive series unlock:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to perform comprehensive series unlock check',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/series-unlock/status
 * Get current status of series access for all customers
 * This provides a summary without making any changes
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Admin requested series unlock status');
    
    // Get all customers with series purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from('guest_course_purchases')
      .select(`
        customer_email,
        customer_name,
        payment_method,
        course_price,
        courses!inner(
          course_id,
          title,
          video_series,
          video_part
        )
      `)
      .eq('payment_status', 'PAID')
      .not('courses.video_series', 'is', null)
      .not('courses.video_series', 'eq', '')
      .order('customer_email')
      .order('courses(video_part)');

    if (purchasesError) {
      throw purchasesError;
    }

    // Group by customer and series
    const customerSeriesAccess = new Map();
    const seriesUnlockCount = new Map();
    
    purchases.forEach(purchase => {
      const email = purchase.customer_email;
      const series = purchase.courses.video_series;
      const isSeriesUnlock = purchase.payment_method === 'SERIES_UNLOCK';
      
      if (!customerSeriesAccess.has(email)) {
        customerSeriesAccess.set(email, {
          name: purchase.customer_name,
          series: new Map()
        });
      }
      
      if (!customerSeriesAccess.get(email).series.has(series)) {
        customerSeriesAccess.get(email).series.set(series, {
          courses: [],
          unlockedCount: 0
        });
      }
      
      customerSeriesAccess.get(email).series.get(series).courses.push({
        courseId: purchase.courses.course_id,
        title: purchase.courses.title,
        part: purchase.courses.video_part,
        price: purchase.course_price,
        paymentMethod: purchase.payment_method
      });
      
      if (isSeriesUnlock) {
        customerSeriesAccess.get(email).series.get(series).unlockedCount++;
        
        if (!seriesUnlockCount.has(series)) {
          seriesUnlockCount.set(series, 0);
        }
        seriesUnlockCount.set(series, seriesUnlockCount.get(series) + 1);
      }
    });

    // Convert to response format
    const customers = [];
    for (const [email, customerData] of customerSeriesAccess) {
      const seriesData = [];
      for (const [series, data] of customerData.series) {
        seriesData.push({
          seriesName: series,
          totalCourses: data.courses.length,
          unlockedCourses: data.unlockedCount,
          courses: data.courses.sort((a, b) => a.part - b.part)
        });
      }
      
      customers.push({
        email,
        name: customerData.name,
        series: seriesData
      });
    }

    // Get series unlock statistics
    const seriesStats = [];
    for (const [series, unlockCount] of seriesUnlockCount) {
      seriesStats.push({
        seriesName: series,
        totalUnlocks: unlockCount
      });
    }

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        totalSeriesUnlocks: Array.from(seriesUnlockCount.values()).reduce((sum, count) => sum + count, 0),
        customers,
        seriesStats
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting series unlock status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get series unlock status',
      error: error.message
    });
  }
});

module.exports = router;