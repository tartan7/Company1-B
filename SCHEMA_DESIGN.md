# Tourism Booking System - PostgreSQL Schema Design
**Version:** 1.0  
**Date:** 2026-05-22  
**Status:** CTO Review

---

## Overview

This document describes the complete PostgreSQL schema for the tourism booking system MVP. The schema supports operators listing activities, customers booking experiences, managing payments, and submitting reviews.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│          USERS                      │
├─────────────────────────────────────┤
│ id (UUID, PK)                       │
│ email (VARCHAR, UNIQUE)             │
│ password_hash (VARCHAR)             │
│ full_name (VARCHAR)                 │
│ phone (VARCHAR)                     │
│ user_type (VARCHAR)                 │ ← "operator" | "customer"
│ profile_picture_url (TEXT)          │
│ bio (TEXT)                          │
│ timezone (VARCHAR)                  │
│ is_verified (BOOLEAN)               │
│ is_active (BOOLEAN)                 │
│ created_at (TIMESTAMP)              │
│ updated_at (TIMESTAMP)              │
│ deleted_at (TIMESTAMP)              │
└──────────────────────────────────────┘
         ↑                      ↑
         │                      │
    (FK)┌┴──────────┐      (FK)┌┴──────────────┐
         │ operator │          │   customer    │
         │          │          │               │
         │          │          │               │
    ┌────┴──────────────────┐  │    ┌──────────┴──────────┐
    │    ACTIVITIES         │  │    │    BOOKINGS        │
    ├──────────────────────┤  │    ├──────────────────┤
    │ id (UUID, PK)        │  │    │ id (UUID, PK)  │
    │ operator_id (FK)─────┘  │    │ customer_id (FK)──┘
    │ name (VARCHAR)         │    │ schedule_id (FK)──┐
    │ description (TEXT)     │    │ activity_id (FK)──┼─┐
    │ category (VARCHAR)     │    │ num_participants   │ │
    │ location (VARCHAR)     │    │ total_price        │ │
    │ latitude/longitude     │    │ currency           │ │
    │ price_per_person       │    │ status             │ │
    │ duration_minutes       │    │ booking_date       │ │
    │ max_participants       │    │ created_at         │ │
    │ min_participants       │    │ updated_at         │ │
    │ is_active              │    └────────────────────┘ │
    │ created_at             │                           │
    └────────────┬───────────┘                           │
                 │                                       │
                 │ (FK)                                  │
                 │                                       │
    ┌────────────┴──────────────────┐                   │
    │      SCHEDULES                 │                   │
    ├────────────────────────────────┤                   │
    │ id (UUID, PK)                  │                   │
    │ activity_id (FK)───────────────┘                   │
    │ start_time (TIMESTAMP)                             │
    │ end_time (TIMESTAMP)                               │
    │ available_slots (INTEGER)                          │
    │ booked_slots (INTEGER)                             │
    │ recurrence_type                                    │
    │ recurrence_end_date                                │
    │ is_cancelled (BOOLEAN)                             │
    │ created_at                                         │
    └────────────────────────────────┘
              ↑
              │ (FK)
              │
    ┌─────────┴──────────────────┐
    │      REVIEWS               │
    ├────────────────────────────┤
    │ id (UUID, PK)              │
    │ booking_id (FK)            │
    │ customer_id (FK)           │
    │ activity_id (FK)           │
    │ rating (INTEGER 1-5)       │
    │ title (VARCHAR)            │
    │ comment (TEXT)             │
    │ status                     │
    │ created_at                 │
    └────────────────────────────┘

    ┌────────────────────────────┐
    │      PAYMENTS              │
    ├────────────────────────────┤
    │ id (UUID, PK)              │
    │ booking_id (FK)            │
    │ customer_id (FK)           │
    │ amount (DECIMAL)           │
    │ currency (VARCHAR)         │
    │ payment_method             │
    │ payment_status             │
    │ transaction_id             │
    │ processor_response         │
    │ attempted_at               │
    │ completed_at               │
    │ refunded_at                │
    │ created_at                 │
    └────────────────────────────┘

    ┌────────────────────────────┐
    │   NOTIFICATIONS            │
    ├────────────────────────────┤
    │ id (UUID, PK)              │
    │ user_id (FK)               │
    │ related_booking_id (FK)    │
    │ related_activity_id (FK)   │
    │ notification_type          │
    │ title (VARCHAR)            │
    │ message (TEXT)             │
    │ is_read (BOOLEAN)          │
    │ delivery_method            │
    │ sent_at                    │
    │ created_at                 │
    └────────────────────────────┘
```

---

## Table Descriptions

### 1. **USERS**
Stores user accounts for both operators and customers.

**Key Features:**
- UUID primary key for distributed systems
- `user_type` constraint ensures only "operator" or "customer"
- `timezone` field for timezone-aware operations
- Soft delete support via `deleted_at`
- Verification and active status tracking
- Indexed by email for login lookups

**Constraints:**
- `email` is UNIQUE
- `user_type` must be 'operator' or 'customer'
- `is_verified` and `is_active` default to FALSE and TRUE respectively

---

### 2. **ACTIVITIES**
Represents tourist activities/experiences offered by operators.

**Key Features:**
- Foreign key to `users` (operator_id) with CASCADE delete
- Geo-coordinates (latitude/longitude) for location-based search
- Price per person with currency support
- Participant limits (min/max) for capacity management
- Difficulty level for filtering
- Array field for multiple images
- Category-based filtering

**Constraints:**
- `price_per_person` must be > 0
- `duration_minutes` must be > 0
- `max_participants` must be > 0
- `min_participants` defaults to 1
- `difficulty_level` must be one of: easy, moderate, hard

**Indexes:**
- Composite index on (`activity_id`, `start_time`) for schedule queries
- Geo-spatial index on latitude/longitude for location searches
- Category and operator filters

---

### 3. **SCHEDULES**
Available time slots for activities.

**Key Features:**
- Foreign key to `activities` with CASCADE delete
- Recurrence support (once, daily, weekly, monthly)
- Slot management: `available_slots` vs `booked_slots`
- Cancellation tracking
- Timezone-aware timestamps

**Constraints:**
- `booked_slots` ≤ `available_slots` (enforced with CHECK constraint)
- `start_time` < `end_time` (enforced with CHECK constraint)
- `available_slots` ≥ 0

**Critical Logic:**
- `booked_slots` increases when bookings are confirmed
- `available_slots` can only decrease when activity operator updates it
- When `booked_slots == available_slots`, no new bookings can be added

---

### 4. **BOOKINGS**
Customer bookings for activity schedules.

**Key Features:**
- Foreign keys to customer, schedule, and activity
- Status tracking (pending, confirmed, cancelled, completed)
- Number of participants
- Total price calculation
- Special requests field
- Audit timestamps (booking_date, confirmed_date, cancelled_date)

**Constraints:**
- `num_participants` > 0
- `total_price` > 0
- `status` must be one of: pending, confirmed, cancelled, completed

**Business Logic:**
- When a booking is created, schedule's `booked_slots` should increment
- When cancelled, `booked_slots` should decrement
- Prevents overbooking through database constraints

---

### 5. **REVIEWS**
Customer reviews and ratings for completed activities.

**Key Features:**
- Foreign keys to booking, customer, and activity
- Rating scale 1-5
- Helpful/unhelpful counters
- Review status (pending approval)
- Verified purchase flag (linked to confirmed booking)

**Constraints:**
- `rating` must be 1-5
- `status` must be one of: pending, approved, rejected, flagged
- `helpful_count` and `unhelpful_count` default to 0

---

### 6. **PAYMENTS**
Payment records and transaction tracking.

**Key Features:**
- Foreign keys to booking and customer
- Multiple payment method support
- Transaction ID for settlement reconciliation
- Processor response logging
- Refund tracking with reason

**Constraints:**
- `amount` > 0
- `payment_method` must be one of: credit_card, debit_card, paypal, bank_transfer, wallet
- `payment_status` must be one of: pending, processing, completed, failed, refunded
- `transaction_id` is UNIQUE

**Indexes:**
- Composite index on (`payment_status`, `completed_at`) for settlement reports

---

### 7. **NOTIFICATIONS**
System notifications for users.

**Key Features:**
- Foreign keys to user, booking, and activity (activity is optional)
- Notification type enumeration
- Read status tracking with timestamp
- Multiple delivery methods (in_app, email, sms, push)
- Related entity links for navigation

**Constraints:**
- `notification_type` must be one of: booking_confirmed, booking_cancelled, booking_reminder, review_request, activity_cancelled, payment_received, refund_processed, new_message, system_alert
- `delivery_method` defaults to 'in_app'

---

## Key Design Decisions

### 1. **UUID Primary Keys**
All tables use UUID (via `uuid-ossp` extension) instead of auto-incrementing integers to:
- Support horizontal scaling and distributed systems
- Hide internal ID sequences from API
- Prevent enumeration attacks

### 2. **Timezone-Aware Timestamps**
All timestamps use `TIMESTAMP WITH TIME ZONE`:
- Stored in UTC internally
- Each user has a `timezone` preference in the `users` table
- Application converts to user's timezone for display
- Eliminates timezone conversion bugs

### 3. **Soft Deletes**
Tables with `deleted_at` columns support soft deletes:
- Maintain audit trail and referential integrity
- Preserve relationships for historical bookings/reviews
- Hard deletion occurs when related entities are explicitly removed

### 4. **Composite Indexes**
Specific indexes for common queries:
- User bookings timeline: `(customer_id, booking_date DESC)`
- Schedule availability: `(activity_id, start_time)` where available_slots > 0
- Partial indexes on filtered queries (e.g., active activities only)

### 5. **Constraint Enforcement**
Business logic encoded in database constraints:
- Prevents application-level race conditions
- Ensures data integrity at the database layer
- CHECK constraints for price/participant validation
- FOREIGN KEY constraints with CASCADE for cleanup

### 6. **Audit Trail**
Every table includes:
- `created_at`: Record creation time (auto-set)
- `updated_at`: Last modification time (auto-updated via trigger)
- Enables audit logging and recovery

### 7. **Slot Management**
The `schedules` table design prevents overbooking:
```
available_slots: Total capacity for the time slot
booked_slots: Number of confirmed bookings
Constraint: booked_slots <= available_slots
```

When a booking is confirmed:
1. Verify `booked_slots < available_slots`
2. Increment `booked_slots`
3. If they become equal, the schedule is fully booked

---

## Performance Optimizations

### Indexes for Query Patterns

**User Authentication & Lookup:**
- `users(email)` — Login queries

**Activity Discovery:**
- `activities(category)` — Browse by category
- `activities(location)` — Geo-spatial searches
- `activities(operator_id, is_active)` — Operator's activities

**Booking Management:**
- `bookings(customer_id, booking_date DESC)` — User's booking history
- `bookings(schedule_id, status)` — Check schedule occupancy
- `bookings(customer_id, status)` — Active bookings

**Schedule Availability:**
- `schedules(activity_id, start_time)` — Available slots for an activity
- Partial index: `available_slots > 0 AND is_cancelled = FALSE`

**Payment Processing:**
- `payments(payment_status, completed_at DESC)` — Settlement reports
- `payments(transaction_id)` — Transaction lookup

**Notification Delivery:**
- `notifications(user_id, is_read)` — Unread count
- `notifications(sent_at DESC)` — Recent notifications

### Database Constraints

**Automatic Timestamp Updates:**
- Trigger function `update_updated_at_column()` updates `updated_at` on every row modification

**Referential Integrity:**
- Foreign keys with `ON DELETE CASCADE` ensure related records clean up properly
- Prevents orphaned bookings/reviews when activities are deleted

---

## Migration Path

The schema is designed for the tourism booking MVP with room for future enhancements:

**Future Additions (Not in MVP):**
- Coupon/discount codes table
- Activity ratings aggregation table (denormalized for performance)
- User preferences/favorites table
- Guide/instructor profiles (linked to operators)
- Activity amenities/tags (many-to-many relationship)
- Booking modifications/rescheduling history
- Dispute/complaint management

---

## Access Patterns & Common Queries

### 1. Find Available Schedules for an Activity
```sql
SELECT * FROM schedules 
WHERE activity_id = ? 
  AND start_time > NOW()
  AND is_cancelled = FALSE
  AND available_slots > booked_slots
ORDER BY start_time ASC;
```

### 2. Get Customer's Booking History
```sql
SELECT b.*, a.name, s.start_time
FROM bookings b
JOIN activities a ON b.activity_id = a.id
JOIN schedules s ON b.schedule_id = s.id
WHERE b.customer_id = ?
ORDER BY s.start_time DESC;
```

### 3. Get Operator's Revenue
```sql
SELECT 
  SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount ELSE 0 END) as revenue,
  COUNT(b.id) as total_bookings
FROM bookings b
JOIN activities a ON b.activity_id = a.id
JOIN payments p ON b.id = p.booking_id
WHERE a.operator_id = ?
  AND b.status = 'completed'
  AND p.payment_status = 'completed';
```

### 4. Find Activities by Location
```sql
SELECT * FROM activities
WHERE is_active = TRUE
  AND (latitude, longitude) <-> (?, ?)::point < ?
ORDER BY (latitude, longitude) <-> (?, ?)::point ASC;
```

### 5. Check Schedule Capacity
```sql
SELECT available_slots - booked_slots as remaining_slots
FROM schedules
WHERE id = ?
FOR UPDATE; -- Prevents race conditions
```

---

## Data Integrity Rules

1. **Booking Constraints:**
   - Cannot book more participants than `max_participants - min_participants + 1`
   - Cannot book for cancelled schedules
   - Cannot have duplicate active bookings for same schedule + customer

2. **Payment Constraints:**
   - Payment amount must equal booking total_price
   - Only one successful payment per booking
   - Refunds cannot exceed original payment

3. **Review Constraints:**
   - Can only review completed bookings
   - Can only review within 30 days of activity completion (application-enforced)
   - One review per customer per booking

4. **Schedule Constraints:**
   - Cannot update booked_slots directly (only via booking creation/cancellation)
   - Cannot create bookings beyond available_slots + booked_slots

---

## Deployment Notes

1. **Extensions Required:**
   - `uuid-ossp` for UUID generation
   - `pg_trgm` for text search (reserved for future use)

2. **Backup & Recovery:**
   - All tables support point-in-time recovery
   - Soft-delete columns should be included in backup retention policy

3. **Scaling Considerations:**
   - Use UUID primary keys for horizontal sharding by user_id
   - Activity geo-queries may benefit from PostGIS extension in future
   - Consider read replicas for heavy reporting queries

---

## CTO Approval Checklist

- [x] All 7 tables defined with proper types
- [x] Primary keys (UUID) and foreign keys defined
- [x] CHECK constraints for business logic (price > 0, slots validation, etc.)
- [x] Unique constraints on email and transaction_id
- [x] NOT NULL constraints on required fields
- [x] Default values appropriate (timestamps, status fields)
- [x] Composite indexes for common query patterns
- [x] Soft-delete support via deleted_at columns
- [x] Timezone-aware timestamps (TIMESTAMP WITH TIME ZONE)
- [x] Audit trail (created_at, updated_at)
- [x] Data integrity rules documented
- [x] ER diagram provided
- [x] Migration-ready (no breaking changes to future additions)

---

**Status:** Ready for Implementation  
**Blocker:** P1.2.2 (Migration Framework)  
**Next Step:** Create migration file and implement in target environment
