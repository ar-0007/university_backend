// src/graphql/resolvers/userResolver.js
const authService = require('../../services/authService');
const userService = require('../../services/userService'); // We'll create this soon

const userResolvers = {
  Query: {
    // Placeholder for fetching user data (e.g., currentUser, getUserById)
    // We'll add these after basic authentication is set up.
    users: async (parent, args, context) => {
      // Example: Fetch all users (for admin panel)
      // This resolver will need authentication and authorization checks.
      if (context.user && context.user.role === 'admin') {
        return userService.getAllUsers(context.supabase);
      }
      throw new Error('Unauthorized access to users list.');
    },
    currentUser: async (parent, args, context) => {
      // Returns the currently logged-in user's details
      if (!context.user) {
        throw new Error('Not authenticated.');
      }
      // Fetch full user details from DB based on context.user.id
      return userService.getUserById(context.supabase, context.user.id);
    }
  },
  Mutation: {
    // Admin-triggered user account creation (for new students after website payment)
    createUserAccount: async (parent, { email, firstName, lastName, role }, context) => {
      // This mutation should only be callable by an 'admin' role
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can create user accounts.');
      }

      // Call the auth service to handle user creation and credential emailing
      const newUser = await authService.createUserAndSendCredentials(
        context.supabase,
        email,
        firstName,
        lastName,
        role
      );
      return newUser; // Return relevant user data (e.g., user_id, email)
    },

    // User Login (for all platforms)
    login: async (parent, { email, password }, context) => {
      // Call the auth service to handle login and JWT generation
      const { user, token } = await authService.loginUser(context.supabase, email, password);
      return { user, token }; // Return the user object and JWT
    },

    // Placeholder for password change
    changePassword: async (parent, { oldPassword, newPassword }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated.');
      }
      await authService.changeUserPassword(context.supabase, context.user.id, oldPassword, newPassword);
      return "Password changed successfully.";
    },

    // Placeholder for updating user profile (e.g., firstName, lastName from app)
    updateUserProfile: async (parent, { firstName, lastName }, context) => {
      if (!context.user) {
        throw new Error('Not authenticated.');
      }
      const updatedUser = await userService.updateUserProfile(context.supabase, context.user.id, { firstName, lastName });
      return updatedUser;
    }
  },
  // If you have fields in your User type that need custom resolution (e.g., a computed field)
  // User: {
  //   fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
  // },
};

module.exports = userResolvers;
