// src/services/userService.js
const userService = {
  /**
   * Retrieves a user by their ID from the database.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The UUID of the user.
   * @returns {Promise<object|null>} The user object, or null if not found.
   */
  getUserById: async (supabase, userId) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('user_id, email, first_name, last_name, role, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  },

  /**
   * Retrieves all users from the database.
   * @param {object} supabase - The Supabase client instance.
   * @returns {Promise<Array<object>>} An array of user objects.
   */
  getAllUsers: async (supabase) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, email, first_name, last_name, role, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      return users;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  /**
   * Updates a user's profile information (e.g., first name, last name).
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The UUID of the user to update.
   * @param {object} updates - An object containing fields to update (e.g., { firstName: 'NewName' }).
   * @returns {Promise<object>} The updated user object.
   */
  updateUserProfile: async (supabase, userId, updates) => {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          updated_at: new Date().toISOString() // Trigger updated_at manually if not using DB trigger
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }
      return updatedUser;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  },

  /**
   * Blocks or unblocks a user.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - The UUID of the user to update.
   * @param {boolean} isActive - True to activate, false to block.
   * @returns {Promise<object>} The updated user object.
   */
  setUserActiveStatus: async (supabase, userId, isActive) => {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user active status:', error);
        throw new Error(`Failed to update user status: ${error.message}`);
      }
      return updatedUser;
    } catch (error) {
      console.error('Error in setUserActiveStatus:', error);
      throw error;
    }
  },

  /**
   * Creates a user account from guest course purchase data
   * @param {object} supabase - The Supabase client instance.
   * @param {object} purchaseData - Guest purchase data containing customer info.
   * @returns {Promise<object>} The created user object with credentials.
   */
  createUserFromGuestPurchase: async (supabase, purchaseData) => {
    try {
      // Check if user already exists with this email
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id, email')
        .eq('email', purchaseData.customer_email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        throw new Error(`Failed to check existing user: ${checkError.message}`);
      }

      // If user already exists, return existing user
      if (existingUser) {
        console.log(`User already exists with email: ${purchaseData.customer_email}`);
        return existingUser;
      }

                   // Generate random password
             const password = Math.random().toString(36).substring(2, 12);
             
             // Hash the password
             const bcrypt = require('bcrypt');
             const saltRounds = 10;
             const hashedPassword = await bcrypt.hash(password, saltRounds);
             
             // Generate salt (bcrypt includes salt in the hash, but we need a separate salt for the constraint)
             const salt = Math.random().toString(36).substring(2, 15);
       
             // Parse customer name into first and last name
             const nameParts = purchaseData.customer_name.trim().split(' ');
             const firstName = nameParts[0] || '';
             const lastName = nameParts.slice(1).join(' ') || '';
       
             // Create new user
             const { data: newUser, error: createError } = await supabase
               .from('users')
               .insert({
                 email: purchaseData.customer_email,
                 password_hash: hashedPassword,
                 salt: salt,
                 first_name: firstName,
                 last_name: lastName,
                 role: 'STUDENT',
                 is_active: true
               })
               .select('user_id, email, first_name, last_name, role, is_active')
               .single();

      if (createError) {
        console.error('Error creating user from guest purchase:', createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

                   // Return user data with plain text password for email
             return {
               ...newUser,
               username: purchaseData.customer_email.split('@')[0], // Use email prefix as username
               plainPassword: password // This will be used in email, not stored in DB
             };
    } catch (error) {
      console.error('Error in createUserFromGuestPurchase:', error);
      throw error;
    }
  },

  /**
   * Generates new credentials for an existing user (for admin resend)
   * @param {object} supabase - The Supabase client instance.
   * @param {string} email - The user's email address.
   * @returns {Promise<object>} The user object with new credentials.
   */
  generateCredentialsForExistingUser: async (supabase, email) => {
    try {
      // Get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, first_name, last_name, role, is_active')
        .eq('email', email)
        .single();

      if (fetchError) {
        console.error('Error fetching existing user:', fetchError);
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Generate new random password
      const newPassword = Math.random().toString(36).substring(2, 12);
      
      // Hash the new password
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Generate new salt
      const newSalt = Math.random().toString(36).substring(2, 15);

      // Update user with new password and change role to STUDENT
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          salt: newSalt,
          role: 'STUDENT', // Change role from GUEST to STUDENT
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.user_id)
        .select('user_id, email, first_name, last_name, role, is_active')
        .single();

      if (updateError) {
        console.error('Error updating user password:', updateError);
        throw new Error(`Failed to update user password: ${updateError.message}`);
      }

      // Return user data with new plain text password for email
      return {
        ...updatedUser,
        username: email.split('@')[0], // Use email prefix as username
        plainPassword: newPassword // This will be used in email, not stored in DB
      };
    } catch (error) {
      console.error('Error in generateCredentialsForExistingUser:', error);
      throw error;
    }
  }
};

module.exports = userService;
