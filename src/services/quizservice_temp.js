// src/services/quizService.js

const quizService = {
  // --- Quiz Operations ---

  /**
   * Creates a new quiz in the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} quizInput - Input data for the quiz (chapterId, title, description, questionsData).
   * @returns {Promise<object>} The newly created quiz object.
   * @throws {Error} If quiz creation fails.
   */
  createQuiz: async (supabase, quizInput) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([
          {
            chapter_id: quizInput.chapterId,
            title: quizInput.title,
            description: quizInput.description,
            questions_data: quizInput.questionsData, // JSONB column
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating quiz:', error);
        throw new Error(`Failed to create quiz: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createQuiz service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all quizzes for a specific chapter.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} chapterId - The ID of the chapter.
   * @returns {Promise<Array<object>>} An array of quiz objects.
   * @throws {Error} If fetching quizzes fails.
   */
  getQuizzesByChapter: async (supabase, chapterId) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          chapters ( chapter_id, title )
        `)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching quizzes by chapter ID:', error);
        throw new Error(`Failed to fetch quizzes: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getQuizzesByChapter service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all quizzes for a specific course by finding chapters within that course.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} courseId - The ID of the course.
   * @returns {Promise<Array<object>>} An array of quiz objects.
   * @throws {Error} If fetching quizzes fails.
   */
  getQuizzesByCourse: async (supabase, courseId) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          chapters!inner ( 
            chapter_id, 
            title, 
            course_id 
          )
        `)
        .eq('chapters.course_id', courseId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching quizzes by course ID:', error);
        throw new Error(`Failed to fetch quizzes: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getQuizzesByCourse service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single quiz by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the quiz.
   * @returns {Promise<object|null>} The quiz object, or null if not found.
   * @throws {Error} If fetching the quiz fails.
   */
  getQuizById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          chapters ( chapter_id, title )
        `)
        .eq('quiz_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching quiz by ID:', error);
        throw new Error(`Failed to fetch quiz: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getQuizById service:', error);
      throw error;
    }
  },

  /**
   * Updates an existing quiz.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the quiz to update.
   * @param {object} updates - Fields to update (title, description, questionsData).
   * @returns {Promise<object>} The updated quiz object.
   * @throws {Error} If the update fails.
   */
  updateQuiz: async (supabase, id, updates) => {
    try {
      const updateData = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.questionsData !== undefined) updateData.questions_data = updates.questionsData;

      const { data, error } = await supabase
        .from('quizzes')
        .update(updateData)
        .eq('quiz_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quiz:', error);
        throw new Error(`Failed to update quiz: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in updateQuiz service:', error);
      throw error;
    }
  },

  /**
   * Deletes a quiz.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the quiz to delete.
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails.
   */
  deleteQuiz: async (supabase, id) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('quiz_id', id);

      if (error) {
        console.error('Error deleting quiz:', error);
        throw new Error(`Failed to delete quiz: ${error.message}`);
      }
      console.log(`Quiz ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error in deleteQuiz service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all quizzes from the database.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of all quiz objects with chapter and course information.
   * @throws {Error} If fetching quizzes fails.
   */
  getAllQuizzes: async (supabase) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          chapters ( 
            chapter_id, 
            title, 
            courses ( 
              course_id, 
              title 
            ) 
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all quizzes:', error);
        throw new Error(`Failed to fetch quizzes: ${error.message}`);
      }
      return data || [];
    } catch (error) {
      console.error('Error in getAllQuizzes service:', error);
      throw error;
    }
  },

  // --- Quiz Attempt Operations ---

  /**
   * Creates a new quiz attempt for a user.
   * @param {object} supabase - The Supabase client instance.
   * @param {object} attemptData - Object containing quiz_id, user_id, answers_data
   * @returns {Promise<object>} The newly created quiz attempt object.
   * @throws {Error} If attempt creation fails.
   */
  createQuizAttempt: async (supabase, attemptData) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert([
          {
            quiz_id: attemptData.quiz_id,
            user_id: attemptData.user_id,
            answers_data: attemptData.answers_data,
            completed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating quiz attempt:', error);
        throw new Error(`Failed to create quiz attempt: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in createQuizAttempt service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all quiz attempts for a specific quiz.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} quizId - The ID of the quiz.
   * @returns {Promise<Array<object>>} An array of quiz attempt objects.
   * @throws {Error} If fetching attempts fails.
   */
  getQuizAttemptsByQuiz: async (supabase, quizId) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          users ( user_id, first_name, last_name, email )
        `)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching quiz attempts by quiz ID:', error);
        throw new Error(`Failed to fetch quiz attempts: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getQuizAttemptsByQuiz service:', error);
      throw error;
    }
  },

  /**
   * Retrieves all quiz attempts made by a specific user.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<Array<object>>} An array of quiz attempt objects.
   * @throws {Error} If fetching attempts fails.
   */
  getQuizAttemptsByUser: async (supabase, userId) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes ( quiz_id, title, description,
            chapters ( chapter_id, title )
          )
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching quiz attempts by user ID:', error);
        throw new Error(`Failed to fetch user quiz attempts: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error in getQuizAttemptsByUser service:', error);
      throw error;
    }
  },

  /**
   * Retrieves quiz attempts by user and quiz.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The ID of the user.
   * @param {string} quizId - The ID of the quiz.
   * @returns {Promise<Array<object>>} An array of quiz attempt objects.
   * @throws {Error} If fetching attempts fails.
   */
  getQuizAttemptsByUserAndQuiz: async (supabase, userId, quizId) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes ( quiz_id, title, description )
        `)
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching quiz attempts by user and quiz:', error);
        throw new Error(`Failed to fetch quiz attempts: ${error.message}`);
      }
      return data || [];
    } catch (error) {
      console.error('Error in getQuizAttemptsByUserAndQuiz service:', error);
      throw error;
    }
  },

  /**
   * Retrieves a single quiz attempt by its ID.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} id - The UUID of the quiz attempt.
   * @returns {Promise<object|null>} The quiz attempt object, or null if not found.
   * @throws {Error} If fetching the attempt fails.
   */
  getQuizAttemptById: async (supabase, id) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes ( quiz_id, title, description ),
          users ( user_id, first_name, last_name, email )
        `)
        .eq('attempt_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error fetching quiz attempt by ID:', error);
        throw new Error(`Failed to fetch quiz attempt: ${error.message}`);
      }
      return data; // Will be null if not found
    } catch (error) {
      console.error('Error in getQuizAttemptById service:', error);
      throw error;
    }
  },
};

module.exports = quizService;
