// src/graphql/types/chapterProgress.js
const { gql } = require('apollo-server-express');

// Define the ChapterProgress GraphQL type and related input types.
// This schema describes how student progress on chapters will be exposed and accepted via the API.
const chapterProgressTypeDefs = gql`
  type ChapterProgress {
    id: ID!
    userId: ID!
    chapterId: ID!
    isCompleted: Boolean!
    completedAt: String # Nullable, set when chapter is marked completed
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    user: User!
    chapter: Chapter!
  }

  input MarkChapterCompletedInput {
    chapterId: ID!
    # userId is taken from context
  }
`;

module.exports = chapterProgressTypeDefs;
