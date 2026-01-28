// src/graphql/types/quizAttempt.js
const { gql } = require('apollo-server-express');

// Define the QuizAttempt GraphQL type and related input types.
// This schema describes how quiz attempt data will be exposed and accepted via the API.
const quizAttemptTypeDefs = gql`
  type QuizAttempt {
    id: ID!
    quizId: ID! # The ID of the quiz this attempt is for
    userId: ID! # The ID of the student who made the attempt
    score: Float! # The score achieved on this attempt (e.g., 0.0 to 100.0)
    completedAt: String!
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    quiz: Quiz! # The quiz details
    user: User! # The student user who made the attempt
  }

  input CreateQuizAttemptInput {
    quizId: ID!
    # userId is taken from context
    score: Float!
    # completedAt is set by backend
  }
`;

module.exports = quizAttemptTypeDefs;
