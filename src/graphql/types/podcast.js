// src/graphql/types/podcast.js
const { gql } = require('apollo-server-express');

// Define the Podcast GraphQL type and related input types.
// This schema describes how podcast data will be exposed and accepted via the API.
const podcastTypeDefs = gql`
  type Podcast {
    id: ID!
    title: String!
    description: String
    videoUrl: String! # URL to the podcast video file (e.g., Cloudinary)
    thumbnailUrl: String # URL to the podcast thumbnail image
    duration: Int # Duration in seconds
    status: String! # Status: draft, published, archived
    publishedAt: String # ISO 8601 date string
    createdAt: String!
    updatedAt: String!
  }

  input CreatePodcastInput {
    title: String!
    description: String
    videoUrl: String!
    thumbnailUrl: String
    duration: Int
    status: String
  }

  input UpdatePodcastInput {
    title: String
    description: String
    videoUrl: String
    thumbnailUrl: String
    duration: Int
    status: String
  }
`;

module.exports = podcastTypeDefs;
