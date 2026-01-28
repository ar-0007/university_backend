// src/graphql/types/submission.js
const { gql } = require('apollo-server-express');

// Define the Submission GraphQL type and related input types.
// This schema describes how assignment submission data will be exposed and accepted via the API.
const submissionTypeDefs = gql`
  type Submission {
    id: ID!
    assignmentId: ID! # The ID of the assignment this submission is for
    userId: ID! # The ID of the student who submitted it
    cloudinaryUrl: String! # Cloudinary URL for the submitted file
    feedback: String # Nullable, provided by admin after grading
    grade: Float # Nullable, provided by admin after grading (e.g., 0.0 to 100.0)
    submittedAt: String!
    gradedAt: String # Nullable, set when feedback/grade is provided
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    assignment: Assignment! # The assignment details
    user: User! # The student user who made the submission
  }

  input CreateSubmissionInput {
    assignmentId: ID!
    # userId is taken from context
    cloudinaryUrl: String!
  }

  input UpdateSubmissionInput {
    feedback: String
    grade: Float
  }
`;

module.exports = submissionTypeDefs;
