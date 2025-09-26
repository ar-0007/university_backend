// src/graphql/types/course.js
const { gql } = require('apollo-server-express');

// Define the Course GraphQL type and related input types.
// This schema describes how course data will be exposed and accepted via the API.
const courseTypeDefs = gql`
  type Course {
    id: ID!
    title: String!
    description: String
    thumbnailUrl: String # Cloudinary URL for the course thumbnail
    isPublished: Boolean!
    createdAt: String!
    updatedAt: String!
    chapters: [Chapter!] # A list of chapters belonging to this course
  }

  input CreateCourseInput {
    title: String!
    description: String
    thumbnailUrl: String
    isPublished: Boolean = false
  }

  input UpdateCourseInput {
    title: String
    description: String
    thumbnailUrl: String
    isPublished: Boolean
  }
`;

module.exports = courseTypeDefs;
