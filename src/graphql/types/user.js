// src/graphql/types/user.js
const { gql } = require('apollo-server-express');

// Define the User GraphQL type
// This schema defines the structure of the User object that clients can query.
// It includes fields like id, email, first name, last name, role, and active status.
// Note: password_hash and salt are NOT exposed via the API for security reasons.
const userTypeDefs = gql`
  enum UserRole {
    STUDENT
    ADMIN
  }

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input UserInput {
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
  }

  # Add any other user-related input types or custom scalars here if needed later
`;

module.exports = userTypeDefs;
