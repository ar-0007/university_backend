// src/graphql/types/assignment.js
const { gql } = require('apollo-server-express');

// Define the Assignment GraphQL type and related input types.
// This schema describes how assignment data will be exposed and accepted via the API.
const assignmentTypeDefs = gql`
  type Assignment {
    id: ID!
    courseId: ID # Nullable, if assignment is course-wide
    chapterId: ID # Nullable, if assignment is chapter-specific
    title: String!
    description: String
    deadline: String # ISO 8601 date string
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    course: Course # The course this assignment belongs to (if course-wide)
    chapter: Chapter # The chapter this assignment belongs to (if chapter-specific)
    submissions: [Submission!] # List of submissions for this assignment
  }

  input CreateAssignmentInput {
    courseId: ID
    chapterId: ID
    title: String!
    description: String
    deadline: String
  }

  input UpdateAssignmentInput {
    title: String
    description: String
    deadline: String
  }
`;

module.exports = assignmentTypeDefs;
