// src/services/courseService.js

const courseService = {
  /**
   * Creates a new course in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} courseInput - The input data for the new course.
   * @returns {Promise<object>} The newly created course object.
   * @throws {Error} If the course creation fails.
   */
  createCourse: async (supabase, courseInput) => {
    try {
      console.log('createCourse service called with input:', courseInput);
      
      const insertData = {
        title: courseInput.title,
        description: courseInput.description,
        thumbnail_url: courseInput.thumbnailUrl,
        intro_video_url: courseInput.introVideoUrl,
        price: courseInput.price || 0,
        category_id: courseInput.categoryId,
        instructor_id: courseInput.instructorId,
        duration_hours: courseInput.durationHours || 0,
        level: courseInput.level || 'BEGINNER',
        is_published: courseInput.isPublished || false,
        video_series: courseInput.videoSeries,
        video_part: courseInput.videoPart || 1,
      };
      
      console.log('Insert data prepared:', insertData);
      
      const { data, error } = await supabase
        .from('courses')
        .insert([insertData])
        .select(`
          *,
          categories:category_id(name, slug),
          instructor:instructor_id(instructor_id, first_name, last_name, email, bio, specialties, experience_years, profile_image_url)
        `)
        .single();
  
      if (error) {
        console.error('Supabase error creating course:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to create course: ${error.message}`);
      }
      
      // If the course belongs to a series, perform comprehensive series unlock
      if (data.video_series) {
        try {
          console.log(`🔄 SERIES UNLOCK: New course "${data.title}" added to series "${data.video_series}", performing comprehensive series check...`);
          
          // First, unlock the new course for existing customers in this series
          await courseService.unlockNewCourseForExistingCustomers(supabase, data.course_id, data.video_series);
          
          // Then, perform a comprehensive check to ensure all customers have access to all series parts
          console.log('🔍 Running comprehensive series unlock check for all customers...');
          await courseService.checkAndUnlockAllSeriesParts(supabase);
          
        } catch (unlockError) {
          console.error('Error in comprehensive series unlock:', unlockError);
          // Don't throw error here as course creation was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Error in createCourse service:', error);
      throw error;
    }
  },


  /**
   * Retrieves all courses from the database.
   * Can filter by published status.
   * @param {object} supabase - The Supabase client instance.
   * @param {boolean} [isPublished=true] - Optional. If true, only returns published courses.
   * @returns {Promise<Array<object>>} An array of course objects.
   * @throws {Error} If fetching courses fails.
   */
  getAllCourses: async (supabase, isPublished = true) => {
    try {
      let query = supabase
        .from('courses')
        .select(`
          *,
          categories:category_id(name, slug, description),
          instructor:instructor_id(instructor_id, first_name, last_name, email, bio, specialties, experience_years, profile_image_url)
        `);

      if (isPublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all courses:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error in getAllCourses service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single course by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the course.
   * @returns {Promise<object|null>} The course object, or null if not found.
   * @throws {Error} If fetching the course fails.
   */
  getCourseById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          categories:category_id(name, slug, description),
          instructor:instructor_id(instructor_id, first_name, last_name, email, bio, specialties, experience_years, profile_image_url)
        `)
        .eq('course_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching course by ID:', error);
        throw new Error(`Failed to fetch course: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getCourseById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing course in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the course to update.
   * @param {object} updates - An object containing the fields to update.
   * @returns {Promise<object>} The updated course object.
   * @throws {Error} If the course update fails.
   */
  updateCourse: async (supabase, id, updates) => {
    try {
      const updateData = {};
      
      // Map frontend field names to database column names
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.introVideoUrl !== undefined) updateData.intro_video_url = updates.introVideoUrl;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.instructor_id !== undefined) updateData.instructor_id = updates.instructor_id;
      if (updates.duration_hours !== undefined) updateData.duration_hours = updates.duration_hours;
      if (updates.level !== undefined) updateData.level = updates.level;
      if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('course_id', id)
        .select(`
          *,
          categories:category_id(name, slug, description),
          instructor:instructor_id(instructor_id, first_name, last_name, email, bio, specialties, experience_years, profile_image_url)
        `)
        .single();

      if (error) {
        console.error('Error updating course:', error);
        throw new Error(`Failed to update course: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateCourse service:', error);
      throw error;
    }
  },

  /**
   * Deletes a course from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the course to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the course deletion fails.
   */
  deleteCourse: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('course_id', id);

      if (error) {
        console.error('Error deleting course:', error);
        throw new Error(`Failed to delete course: ${error.message}`);
      }
      console.log(`Course ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteCourse service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all categories from the database.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of category objects.
   * @throws {Error} If fetching categories fails.
   */
  getAllCategories: async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
  
      if (error) {
        console.error('Error fetching categories:', error);
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getAllCategories service:', error);
      throw error;
    }
  },
  
  /**
   * Creates a new category in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} categoryInput - The input data for the new category.
   * @returns {Promise<object>} The newly created category object.
   * @throws {Error} If the category creation fails.
   */
  createCategory: async (supabase, categoryInput) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: categoryInput.name,
            description: categoryInput.description,
            slug: categoryInput.slug || categoryInput.name.toLowerCase().replace(/\s+/g, '-'),
            is_active: categoryInput.isActive !== undefined ? categoryInput.isActive : true,
          },
        ])
        .select()
        .single();
  
      if (error) {
        console.error('Error creating category:', error);
        throw new Error(`Failed to create category: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createCategory service:', error);
      throw error;
    }
  },

  /**
   * Deletes a category from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the category to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the category deletion fails.
   */
  deleteCategory: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('category_id', id);

      if (error) {
        console.error('Error deleting category:', error);
        throw new Error(`Failed to delete category: ${error.message}`);
      }
      console.log(`Category ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteCategory service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all unique video series names from the database.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<string>>} An array of unique video series names.
   * @throws {Error} If fetching video series fails.
   */
  getVideoSeries: async (supabase) => {
    try {
      console.log('Fetching video series from database...');
      
      const { data, error } = await supabase
        .from('courses')
        .select('video_series')
        .not('video_series', 'is', null)
        .not('video_series', 'eq', '')
        .order('video_series', { ascending: true });

      if (error) {
        console.error('Error fetching video series:', error);
        throw new Error(`Failed to fetch video series: ${error.message}`);
      }

      console.log('Raw video series data:', data);

      // Extract unique video series names
      const uniqueSeries = [...new Set(data.map(course => course.video_series))];
      console.log('Unique video series:', uniqueSeries);
      
      return uniqueSeries;
    } catch (error) {
      console.error('Error in getVideoSeries service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all courses for a specific video series.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} seriesName - The name of the video series.
   * @returns {Promise<Array<object>>} An array of course objects for the series.
   * @throws {Error} If fetching courses fails.
   */
  getCoursesBySeries: async (supabase, seriesName) => {
    try {
      console.log(`Fetching courses for series: ${seriesName}`);
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          categories:category_id(name, slug, description),
          instructor:instructor_id(instructor_id, first_name, last_name, email, bio, specialties, experience_years, profile_image_url)
        `)
        .eq('video_series', seriesName)
        .eq('is_published', true)
        .not('video_part', 'is', null)
        .order('video_part', { ascending: true });

      if (error) {
        console.error('Error fetching courses by series:', error);
        throw new Error(`Failed to fetch courses for series: ${error.message}`);
      }

      console.log(`Found ${data.length} courses for series: ${seriesName}`);
      return data;
    } catch (error) {
      console.error('Error in getCoursesBySeries service:', error);
      throw error;
    }
  },

  /**
   * Unlocks a new course for existing customers who have purchased other courses in the same series
   * @param {object} supabase - The Supabase client instance
   * @param {string} newCourseId - The ID of the newly created course
   * @param {string} videoSeries - The video series name
   */
  unlockNewCourseForExistingCustomers: async (supabase, newCourseId, videoSeries) => {
    try {
      console.log(`🔍 RETROACTIVE UNLOCK: Finding customers who own other courses in series "${videoSeries}"`);
      
      // Find all customers who have purchased other courses in this series
      const { data: existingCustomers, error: customersError } = await supabase
        .from('guest_course_purchases')
        .select(`
          customer_email,
          customer_name,
          customer_phone,
          courses!inner(
            course_id,
            title,
            video_series
          )
        `)
        .eq('payment_status', 'PAID')
        .eq('courses.video_series', videoSeries)
        .neq('courses.course_id', newCourseId); // Exclude the new course itself

      if (customersError) {
        console.error('Error finding existing customers:', customersError);
        throw customersError;
      }

      if (!existingCustomers || existingCustomers.length === 0) {
        console.log('📭 RETROACTIVE UNLOCK: No existing customers found in this series');
        return;
      }

      // Get unique customers (remove duplicates)
      const uniqueCustomers = existingCustomers.reduce((acc, purchase) => {
        const key = purchase.customer_email;
        if (!acc[key]) {
          acc[key] = {
            email: purchase.customer_email,
            name: purchase.customer_name,
            phone: purchase.customer_phone
          };
        }
        return acc;
      }, {});

      const customerList = Object.values(uniqueCustomers);
      console.log(`👥 RETROACTIVE UNLOCK: Found ${customerList.length} unique customers to unlock`);

      // Get the new course details
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .select('title')
        .eq('course_id', newCourseId)
        .single();

      if (courseError) {
        console.error('Error fetching new course details:', courseError);
        throw courseError;
      }

      let unlockedCount = 0;

      // Create free purchase records for each customer
      for (const customer of customerList) {
        try {
          // Check if customer already has access to this course
          const { data: existingAccess, error: accessError } = await supabase
            .from('guest_course_purchases')
            .select('purchase_id')
            .eq('customer_email', customer.email)
            .eq('course_id', newCourseId)
            .eq('payment_status', 'PAID');

          if (accessError) {
            console.error(`Error checking existing access for ${customer.email}:`, accessError);
            continue;
          }

          if (existingAccess && existingAccess.length > 0) {
            console.log(`⏭️  RETROACTIVE UNLOCK: ${customer.email} already has access to "${newCourse.title}"`);
            continue;
          }

          // Create free purchase record
          const { error: insertError } = await supabase
            .from('guest_course_purchases')
            .insert({
              course_id: newCourseId,
              customer_email: customer.email,
              customer_name: customer.name,
              customer_phone: customer.phone,
              course_price: 0,
              payment_status: 'PAID',
              payment_method: 'SERIES_UNLOCK',
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`Error creating free purchase for ${customer.email}:`, insertError);
            continue;
          }

          console.log(`🎉 RETROACTIVE UNLOCK: Unlocked "${newCourse.title}" for ${customer.email}`);
          unlockedCount++;

          // Try to unlock chapters if user account exists
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('user_id')
              .eq('email', customer.email)
              .single();

            if (userData) {
              const userChapterAccessService = require('./userChapterAccessService');
              await userChapterAccessService.unlockAllChaptersForCourse(
                supabase,
                userData.user_id,
                newCourseId
              );
              console.log(`✅ RETROACTIVE UNLOCK: Chapters unlocked for user ${userData.user_id}`);
            }
          } catch (chapterError) {
            console.log(`⚠️  RETROACTIVE UNLOCK: Could not unlock chapters for ${customer.email} (user account may not exist)`);
          }

        } catch (customerError) {
          console.error(`Error processing customer ${customer.email}:`, customerError);
          continue;
        }
      }

      console.log(`🏁 RETROACTIVE UNLOCK COMPLETED: ${unlockedCount} customers unlocked for "${newCourse.title}" in series "${videoSeries}"`);;

    } catch (error) {
      console.error('Error in unlockNewCourseForExistingCustomers:', error);
      throw error;
    }
  },

  /**
   * Comprehensive function to check all existing purchases and unlock missing series parts
   * This ensures that users who purchased any part of a series have access to all available parts
   * @param {object} supabase - The Supabase client instance
   */
  checkAndUnlockAllSeriesParts: async (supabase) => {
    try {
      console.log('🔍 COMPREHENSIVE SERIES CHECK: Starting full series unlock verification...');
      
      // Get all unique customers who have made purchases
      const { data: allCustomers, error: customersError } = await supabase
        .from('guest_course_purchases')
        .select(`
          customer_email,
          customer_name,
          customer_phone,
          courses!inner(
            course_id,
            title,
            video_series,
            video_part
          )
        `)
        .eq('payment_status', 'PAID')
        .not('courses.video_series', 'is', null)
        .not('courses.video_series', 'eq', '');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        throw customersError;
      }

      if (!allCustomers || allCustomers.length === 0) {
        console.log('📭 No customers with series purchases found.');
        return { totalProcessed: 0, totalUnlocked: 0 };
      }

      // Group customers by email and their purchased series
      const customerSeriesMap = new Map();
      
      allCustomers.forEach(purchase => {
        const email = purchase.customer_email;
        const series = purchase.courses.video_series;
        
        if (!customerSeriesMap.has(email)) {
          customerSeriesMap.set(email, {
            name: purchase.customer_name,
            phone: purchase.customer_phone,
            series: new Set()
          });
        }
        
        customerSeriesMap.get(email).series.add(series);
      });

      console.log(`👥 Found ${customerSeriesMap.size} unique customers with series purchases`);
      
      let totalUnlocked = 0;
      let totalProcessed = 0;

      // For each customer, check all series they've purchased
      for (const [email, customerData] of customerSeriesMap) {
        console.log(`\n🔍 Checking customer: ${email}`);
        totalProcessed++;
        
        for (const series of customerData.series) {
          console.log(`  📚 Checking series: "${series}"`);
          
          // Get all courses in this series
          const { data: allSeriesCourses, error: seriesError } = await supabase
            .from('courses')
            .select('course_id, title, video_part')
            .eq('video_series', series)
            .eq('is_published', true)
            .order('video_part', { ascending: true });

          if (seriesError) {
            console.error(`Error fetching courses for series "${series}":`, seriesError);
            continue;
          }

          if (!allSeriesCourses || allSeriesCourses.length === 0) {
            console.log(`    ⚠️  No published courses found in series "${series}"`);
            continue;
          }

          // Get courses this customer already has access to in this series
          const { data: customerAccess, error: accessError } = await supabase
            .from('guest_course_purchases')
            .select('course_id')
            .eq('customer_email', email)
            .eq('payment_status', 'PAID')
            .in('course_id', allSeriesCourses.map(c => c.course_id));

          if (accessError) {
            console.error(`Error checking customer access for ${email}:`, accessError);
            continue;
          }

          const accessedCourseIds = new Set(customerAccess?.map(a => a.course_id) || []);
          const missingCourses = allSeriesCourses.filter(course => !accessedCourseIds.has(course.course_id));

          if (missingCourses.length === 0) {
            console.log(`    ✅ Customer already has access to all ${allSeriesCourses.length} courses in "${series}"`);
            continue;
          }

          console.log(`    🔓 Unlocking ${missingCourses.length} missing courses in "${series}"`);
          
          // Unlock missing courses
          for (const course of missingCourses) {
            try {
              const { error: insertError } = await supabase
                .from('guest_course_purchases')
                .insert({
                  course_id: course.course_id,
                  customer_email: email,
                  customer_name: customerData.name,
                  customer_phone: customerData.phone,
                  course_price: 0,
                  payment_status: 'PAID',
                  payment_method: 'SERIES_UNLOCK',
                  created_at: new Date().toISOString()
                });

              if (insertError) {
                console.error(`      ❌ Error unlocking "${course.title}" for ${email}:`, insertError);
                continue;
              }

              console.log(`      🎉 Unlocked: "${course.title}" (Part ${course.video_part})`);
              totalUnlocked++;

              // Try to unlock chapters if user account exists
              try {
                const { data: userData } = await supabase
                  .from('users')
                  .select('user_id')
                  .eq('email', email)
                  .single();

                if (userData) {
                  await courseService.unlockChaptersForUser(
                    supabase,
                    userData.user_id,
                    course.course_id
                  );
                  console.log(`      📖 Chapters unlocked for user ${userData.user_id}`);
                }
              } catch (chapterError) {
                console.log(`      ⚠️  Could not unlock chapters for ${email} (user account may not exist)`);
              }

            } catch (courseError) {
              console.error(`      ❌ Error processing course "${course.title}":`, courseError);
              continue;
            }
          }
        }
      }

      console.log(`\n🏁 COMPREHENSIVE SERIES CHECK COMPLETED:`);
      console.log(`   👥 Customers processed: ${totalProcessed}`);
      console.log(`   🔓 Total courses unlocked: ${totalUnlocked}`);
      
      return { totalProcessed, totalUnlocked };

    } catch (error) {
      console.error('Error in checkAndUnlockAllSeriesParts:', error);
      throw error;
    }
  }
};

module.exports = courseService;

