// src/graphql/types/mentorshipBooking.js
const { gql } = require('apollo-server-express');

// Define the MentorshipBooking GraphQL type and related input types.
// This schema describes how mentorship booking data will be exposed and accepted via the API.
const mentorshipBookingTypeDefs = gql`
  enum PaymentStatus {
    PENDING
    PAID
    FAILED
  }

  type MentorshipBooking {
    id: ID!
    slotId: ID! # The ID of the mentorship slot booked
    userId: ID! # The ID of the student who booked it
    paymentStatus: PaymentStatus!
    paymentMethod: String
    transactionId: String
    zoomLink: String # Provided by admin after payment confirmation
    bookedAt: String!
    createdAt: String!
    updatedAt: String!

    # Nested fields for convenience (resolvers will fetch these)
    slot: MentorshipSlot! # The booked mentorship slot details
    user: User! # The student user who made the booking
  }

  input CreateMentorshipBookingInput {
    slotId: ID!
    userId: ID! # Should come from context, but included for clarity in input
    paymentMethod: String
    transactionId: String
    # paymentStatus will be 'PENDING' on creation
  }

  input UpdateMentorshipBookingInput {
    paymentStatus: PaymentStatus
    paymentMethod: String
    transactionId: String
    zoomLink: String
  }
`;

module.exports = mentorshipBookingTypeDefs;
