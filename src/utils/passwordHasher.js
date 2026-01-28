// src/utils/passwordHasher.js
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10; // Recommended salt rounds for bcrypt

const passwordHasher = {
  /**
   * Hashes a plain text password.
   * @param {string} password - The plain text password.
   * @returns {Promise<{hashedPassword: string, salt: string}>} Object containing the hashed password and the salt.
   */
  hashPassword: async (password) => {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);
      return { hashedPassword, salt };
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password.');
    }
  },

  
  /**
   * Compares a plain text password with a hashed password.
   * @param {string} plainPassword - The plain text password to compare.
   * @param {string} hashedPassword - The stored hashed password (which already contains the salt).
   * @returns {Promise<boolean>} True if passwords match, false otherwise.
   */
  comparePassword: async (plainPassword, hashedPassword) => {
    try {
      // bcrypt.compare handles the salt internally when comparing against a hash that includes the salt
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error comparing password:', error);
      throw new Error('Failed to compare password.');
    }
  }
};

module.exports = passwordHasher;
