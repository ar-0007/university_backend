// src/graphql/types/mentorshipSlot.js
const { gql } = require('apollo-server-express');

// Define the MentorshipSlot GraphQL type and related input types.
// This schema describes how mentorship slot data will be exposed and accepted via the API.
const mentorshipSlotTypeDefs = gql`
  type MentorshipSlot {
    id: ID!
    mentorUserId: ID! # The ID of the admin user acting as mentor
    startTime: String!
    endTime: String!
    isBooked: Boolean!
    bookedByUserId: ID # Nullable, ID of the student who booked it
    price: Float!
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    mentor: User! # The user object for the mentor
    bookedByUser: User # The user object for the student who booked it (if booked)
  }

  input CreateMentorshipSlotInput {
    mentorUserId: ID!
    startTime: String!
    endTime: String!
    price: Float!
  }

  input UpdateMentorshipSlotInput {
    startTime: String
    endTime: String
    isBooked: Boolean
    bookedByUserId: ID # Can be set to null if unbooked
    price: Float
  }
`;

module.exports = mentorshipSlotTypeDefs;
