// src/graphql/types/enrollment.js
const { gql } = require('apollo-server-express');

// Define the Enrollment GraphQL type and related input types.
// This schema describes how enrollment data will be exposed and accepted via the API.
const enrollmentTypeDefs = gql`
  enum EnrollmentStatus {
    PENDING
    APPROVED
    REJECTED
  }

  type Enrollment {
    id: ID!
    userId: ID!
    courseId: ID!
    status: EnrollmentStatus!
    enrolledAt: String!
    approvedAt: String # Nullable, set when status becomes APPROVED
    createdAt: String!
    updatedAt: String!
    
    # Nested fields for convenience (resolvers will fetch these)
    user: User!
    course: Course!
  }

  input CreateEnrollmentInput {
    userId: ID!
    courseId: ID!
    # Status is typically 'PENDING' on creation, set by backend
  }

  input UpdateEnrollmentInput {
    status: EnrollmentStatus
    # approvedAt is set by backend when status changes to APPROVED
  }
`;

module.exports = enrollmentTypeDefs;
