// src/graphql/types/quiz.js
const { gql } = require('apollo-server-express');

// Define the Quiz GraphQL type and related input types.
// This schema describes how quiz data will be exposed and accepted via the API.
const quizTypeDefs = gql`
  # Represents a single question within a quiz
  type QuizQuestion {
    id: Int! # Unique ID for the question within the quiz
    text: String!
    options: [String!]! # Array of possible answers
    answer: String! # The correct answer
  }

  # Input type for a single question when creating/updating a quiz
  input QuizQuestionInput {
    id: Int!
    text: String!
    options: [String!]!
    answer: String!
  }

  type Quiz {
    id: ID!
    chapterId: ID! # The ID of the chapter this quiz belongs to
    title: String!
    description: String
    questionsData: [QuizQuestion!]! # Array of questions for the quiz
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    chapter: Chapter! # The chapter this quiz belongs to
    attempts: [QuizAttempt!] # List of attempts for this quiz
  }

  input CreateQuizInput {
    chapterId: ID!
    title: String!
    description: String
    questionsData: [QuizQuestionInput!]!
  }

  input UpdateQuizInput {
    title: String
    description: String
    questionsData: [QuizQuestionInput!]
  }
`;

module.exports = quizTypeDefs;
