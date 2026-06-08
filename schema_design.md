# Database Schema Design - ESC-404

## Overview
PostgreSQL schema for a booking platform supporting users, activities, bookings, payments, and reviews.

## Core Entities

### users
- User accounts with profile information
- Email-based authentication
- Timestamps for account lifecycle tracking

### activities
- Bookable activities/experiences offered
- Created by users (hosts)
- Pricing and capacity constraints
- Status tracking (active, inactive, archived)

### bookings
- Links users (guests) to activities
- Tracks quantity, dates, and booking status
- Audit trail with created_at, updated_at

### payments
- Payment records linked to bookings
- Multiple payment methods supported
- Status tracking (pending, completed, failed, refunded)
- Amount tracking with currency support

### reviews
- User-generated ratings and feedback
- Linked to both activities and bookings
- Rating scale 1-5
- Timestamp tracking

## Key Design Decisions

1. **Soft Deletes**: Added `deleted_at` to users, activities for data retention without physical deletion
2. **Indexing**: Composite indexes on commonly queried fields (user_id, activity_id, booking_status, etc.)
3. **Foreign Keys**: CASCADE delete for booking-related tables, RESTRICT for core entities
4. **Currency**: Payments use numeric with currency_code for flexibility
5. **Timestamps**: Created_at and updated_at on all tables for audit trail
6. **Status Enums**: Using PostgreSQL ENUM for strict status tracking

## Database Objects
- ENUM types for statuses
- Tables with primary keys (bigint id)
- Foreign key constraints with appropriate ON DELETE rules
- Indexes for query performance
- Unique constraints on email and slug fields

## Migration Strategy
- Forward-compatible schema changes
- Reversible migrations (UP and DOWN)
- No data loss in reversions
