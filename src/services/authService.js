// src/services/authService.js
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWT token generation
const emailSender = require('../utils/emailSender'); // For sending emails
const passwordHasher = require('../utils/passwordHasher'); // For consistent hashing

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is loaded from .env

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env. This is critical for authentication.');
  process.exit(1); // Exit if critical env var is missing
}

const authService = {
  /**
   * Creates a new user account in Supabase Auth and sends login credentials via email.
   * This is triggered by an admin after a website course purchase is confirmed.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} email - User's email.
   * @param {string} firstName - User's first name.
   * @param {string} lastName - User's last name.
   * @param {string} role - User's role ('student' or 'admin').
   * @returns {Promise<object>} The newly created user object (excluding sensitive data).
   */
  createUserAndSendCredentials: async (supabase, email, firstName, lastName, role) => {
    try {
      // 1. Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8); // Generate an 8-char random string
      const { hashedPassword, salt } = await passwordHasher.hashPassword(tempPassword);

      // 2. Create user in Supabase Auth (this handles the actual auth.users table)
      // Note: Supabase Auth's signup method will also create a user in auth.users table
      // and handle password hashing internally. We are creating a user in our 'public.users' table
      // as a custom user profile. We need to keep these two in sync, or primarily rely on Supabase Auth.
      // For this flow (admin-triggered, custom user table), we'll create in our 'public.users' table
      // and then potentially use Supabase's admin API if we want to also create them in auth.users.
      // For simplicity, let's assume our 'public.users' table is the primary source for profiles.

      // Insert into our custom 'public.users' table
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            email,
            password_hash: hashedPassword,
            salt,
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
          },
        ])
        .select()
        .single(); // Use single() to get the single inserted row

      if (userError) {
        console.error('Error creating user in public.users table:', userError);
        throw new Error(`Failed to create user account: ${userError.message}`);
      }

      // 3. Send credentials via email
      const emailSubject = 'Welcome to Detailers University! Your Login Credentials';
      const emailText = `
        Dear ${firstName},

        Welcome to Detailers University! Your account has been created.
        You can log in to the mobile app using the following credentials:

        Email: ${email}
        Temporary Password: ${tempPassword}

        Please log in and change your password immediately for security reasons.

        Best regards,
        The Detailers University Team
      `;
      await emailSender.sendEmail(email, emailSubject, emailText);

      // Return a sanitized user object
      return {
        id: newUser.user_id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };

    } catch (error) {
      console.error('Error in createUserAndSendCredentials:', error);
      throw error;
    }
  },

  /**
   * Authenticates a user and generates a JWT.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} email - User's email.
   * @param {string} password - User's plain text password.
   * @returns {Promise<{user: object, token: string}>} User object and JWT.
   */
  loginUser: async (supabase, email, password) => {
    try {
      // 1. Fetch user from our 'public.users' table
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, password_hash, salt, first_name, last_name, role, is_active')
        .eq('email', email)
        .single();

      if (fetchError || !user) {
        throw new Error('Invalid credentials or user not found.');
      }

      if (!user.is_active) {
        throw new Error('Your account is currently inactive. Please contact support.');
      }

      // 2. Compare provided password with stored hash
      // Around line 122 - Fix the login function
      // Line 122 - FIXED
      const isMatch = await passwordHasher.comparePassword(password, user.password_hash);
      
      
      if (!isMatch) {
        throw new Error('Invalid credentials.');
      }

      // 3. Generate JWT
      const payload = {
        id: user.user_id,        // ✅ Uses 'id' (not 'userId')
        email: user.email,
        role: user.role,
        isActive: user.is_active,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

      // Return sanitized user object and token
      return {
        user: {
          id: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
        },
        token,
      };

    } catch (error) {
      console.error('Error in loginUser:', error);
      throw error;
    }
  },

  /**
   * Changes a user's password.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} userId - ID of the user changing password.
   * @param {string} oldPassword - User's current plain text password.
   * @param {string} newPassword - User's new plain text password.
   * @returns {Promise<void>}
   */
  changeUserPassword: async (supabase, userId, oldPassword, newPassword) => {
    try {
      // 1. Fetch user from our 'public.users' table to verify old password
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password_hash, salt')
        .eq('user_id', userId)
        .single();

      if (fetchError || !user) {
        throw new Error('User not found.');
      }

      // 2. Verify old password
      // Line 177 - FIXED  
      const isMatch = await passwordHasher.comparePassword(oldPassword, user.password_hash);
      if (!isMatch) {
        throw new Error('Incorrect old password.');
      }

      // 3. Hash new password
      const { hashedPassword, salt } = await passwordHasher.hashPassword(newPassword);

      // 4. Update password in 'public.users' table
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword, salt: salt })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error(`Failed to change password: ${updateError.message}`);
      }

      console.log(`Password for user ${userId} changed successfully.`);
    } catch (error) {
      console.error('Error in changeUserPassword:', error);
      throw error;
    }
  },

  /**
   * Verifies a JWT and returns the decoded payload.
   * This is used in middleware to authenticate requests.
   * @param {string} token - The JWT to verify.
   * @returns {object} Decoded JWT payload.
   * @throws {Error} If the token is invalid or expired.
   */
  verifyToken: (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token.');
    }
  }
};

module.exports = authService;
