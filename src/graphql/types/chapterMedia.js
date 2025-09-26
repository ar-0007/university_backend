// src/graphql/types/chapterMedia.js
const { gql } = require('apollo-server-express');

// Define the ChapterMedia GraphQL type and related input types.
// This schema describes how media items within chapters will be exposed and accepted via the API.
const chapterMediaTypeDefs = gql`
  enum MediaType {
    VIDEO
    DOCUMENT
  }

  type ChapterMedia {
    id: ID!
    chapterId: ID! # The ID of the chapter this media belongs to
    mediaType: MediaType!
    cloudinaryUrl: String! # Cloudinary URL for the actual media file
    fileName: String
    description: String
    orderIndex: Int! # Order of the media item within the chapter
    createdAt: String!
    updatedAt: String!
  }

  input CreateChapterMediaInput {
    chapterId: ID!
    mediaType: MediaType!
    cloudinaryUrl: String!
    fileName: String
    description: String
    orderIndex: Int!
  }

  input UpdateChapterMediaInput {
    mediaType: MediaType
    cloudinaryUrl: String
    fileName: String
    description: String
    orderIndex: Int
  }
`;

module.exports = chapterMediaTypeDefs;
