// src/graphql/types/chapter.js
const { gql } = require('apollo-server-express');

// Define the Chapter GraphQL type and related input types.
// This schema describes how chapter data will be exposed and accepted via the API.
const chapterTypeDefs = gql`
  type Chapter {
    id: ID!
    courseId: ID! # The ID of the course this chapter belongs to
    title: String!
    description: String
    orderIndex: Int! # Order of the chapter within the course
    createdAt: String!
    updatedAt: String!
    media: [ChapterMedia!] # A list of media items (videos, documents) in this chapter
  }

  input CreateChapterInput {
    courseId: ID!
    title: String!
    description: String
    orderIndex: Int!
  }

  input UpdateChapterInput {
    title: String
    description: String
    orderIndex: Int
  }
`;

module.exports = chapterTypeDefs;
