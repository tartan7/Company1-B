# PostgreSQL Database Schema

## Table of Contents
1. [Data Types](#data-types)
2. [Tables](#tables)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Migration Guide](#migration-guide)

## Data Types

### ENUM Types

#### user_status
- `active` - User account is active
- `inactive` - User account is inactive (can be reactivated)
- `suspended` - User account suspended (violation or abuse)
- `deleted` - Soft-deleted user account

#### activity_status
- `active` - Activity is available for booking
- `inactive` - Activity temporarily unavailable
- `archived` - Activity is archived (no longer available)

#### booking_status
- `pending` - Booking awaiting confirmation
- `confirmed` - Booking is confirmed
- `cancelled` - Booking has been cancelled
- `completed` - Booking has been completed

#### payment_status
- `pending` - Payment awaiting processing
- `completed` - Payment successfully processed
- `failed` - Payment processing failed
- `refunded` - Payment has been refunded

#### review_status
- `pending` - Review awaiting moderation
- `published` - Review is publicly visible
- `hidden` - Review is hidden from display

---

## Tables

### users
User accounts and profiles

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email for authentication and communication |
| username | VARCHAR(100) | NOT NULL, UNIQUE | Display name for profile |
| first_name | VARCHAR(100) | NULLABLE | User's first name |
| last_name | VARCHAR(100) | NULLABLE | User's last name |
| phone | VARCHAR(20) | NULLABLE | Contact phone number |
| profile_picture_url | TEXT | NULLABLE | URL to profile picture |
| bio | TEXT | NULLABLE | User biography/description |
| status | user_status | DEFAULT 'active' | Account status |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Account creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP WITH TIME ZONE | NULLABLE | Soft-delete timestamp |

**Indexes:**
- `idx_users_email` - Fast email lookups (where deleted_at IS NULL)
- `idx_users_status` - Status filtering

---

### activities
Bookable activities/experiences offered by hosts

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique activity identifier |
| host_id | BIGINT | NOT NULL, FK → users | Activity creator/host |
| title | VARCHAR(255) | NOT NULL | Activity title |
| description | TEXT | NULLABLE | Full activity description |
| category | VARCHAR(100) | NULLABLE | Activity category |
| location | VARCHAR(255) | NULLABLE | Activity location/address |
| price_per_person | NUMERIC(10,2) | NOT NULL | Pricing per guest |
| currency_code | VARCHAR(3) | DEFAULT 'USD' | Payment currency (ISO 4217) |
| max_capacity | INTEGER | NOT NULL | Maximum number of guests |
| duration_minutes | INTEGER | NULLABLE | Activity duration in minutes |
| status | activity_status | DEFAULT 'active' | Activity availability status |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP WITH TIME ZONE | NULLABLE | Soft-delete timestamp |

**Indexes:**
- `idx_activities_host_id` - Host's activities (where deleted_at IS NULL)
- `idx_activities_status` - Status filtering
- `idx_activities_category` - Category browsing (where deleted_at IS NULL)

**Foreign Keys:**
- `fk_activities_host` → users(id) ON DELETE RESTRICT (prevent host deletion if activities exist)

---

### bookings
Guest bookings for activities

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique booking identifier |
| activity_id | BIGINT | NOT NULL, FK → activities | Activity being booked |
| guest_id | BIGINT | NOT NULL, FK → users | Guest making booking |
| booking_date | DATE | NOT NULL | Date of the booking |
| quantity | INTEGER | DEFAULT 1 | Number of guests |
| total_price | NUMERIC(10,2) | NOT NULL | Total booking price |
| currency_code | VARCHAR(3) | DEFAULT 'USD' | Payment currency |
| status | booking_status | DEFAULT 'pending' | Booking status |
| special_requests | TEXT | NULLABLE | Guest special requests |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_bookings_activity_id` - Activity's bookings
- `idx_bookings_guest_id` - Guest's bookings
- `idx_bookings_status` - Status filtering
- `idx_bookings_date` - Date filtering
- `idx_bookings_activity_date` - Activity + date composite (useful for availability checks)

**Foreign Keys:**
- `fk_bookings_activity` → activities(id) ON DELETE CASCADE
- `fk_bookings_guest` → users(id) ON DELETE RESTRICT

**Constraints:**
- CHECK quantity > 0

---

### payments
Payment records linked to bookings

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique payment identifier |
| booking_id | BIGINT | NOT NULL, FK → bookings | Associated booking |
| amount | NUMERIC(10,2) | NOT NULL | Payment amount |
| currency_code | VARCHAR(3) | DEFAULT 'USD' | Payment currency |
| payment_method | VARCHAR(50) | NOT NULL | Method used (credit_card, bank_transfer, etc.) |
| payment_status | payment_status | DEFAULT 'pending' | Payment status |
| transaction_id | VARCHAR(255) | UNIQUE, NULLABLE | External transaction identifier |
| reference_number | VARCHAR(100) | NULLABLE | Internal reference number |
| notes | TEXT | NULLABLE | Payment notes/metadata |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_payments_booking_id` - Booking's payments
- `idx_payments_status` - Status filtering
- `idx_payments_transaction_id` - Transaction lookup

**Foreign Keys:**
- `fk_payments_booking` → bookings(id) ON DELETE CASCADE

**Constraints:**
- CHECK amount > 0

---

### reviews
User-generated reviews and ratings

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique review identifier |
| activity_id | BIGINT | NOT NULL, FK → activities | Reviewed activity |
| booking_id | BIGINT | NOT NULL, FK → bookings | Associated booking (UNIQUE) |
| reviewer_id | BIGINT | NOT NULL, FK → users | Review author |
| rating | INTEGER | NOT NULL | Rating 1-5 |
| title | VARCHAR(255) | NULLABLE | Review title |
| content | TEXT | NULLABLE | Review body text |
| status | review_status | DEFAULT 'pending' | Review moderation status |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_reviews_activity_id` - Activity's reviews
- `idx_reviews_reviewer_id` - User's reviews
- `idx_reviews_status` - Status filtering
- `idx_reviews_created_at` - Chronological ordering

**Foreign Keys:**
- `fk_reviews_activity` → activities(id) ON DELETE CASCADE
- `fk_reviews_booking` → bookings(id) ON DELETE CASCADE
- `fk_reviews_reviewer` → users(id) ON DELETE CASCADE

**Constraints:**
- UNIQUE(booking_id) - Only one review per booking
- CHECK rating >= 1 AND rating <= 5

---

## Relationships

```
users (1) ──────┬────── (Many) activities (as host)
                │
                ├────── (Many) bookings (as guest)
                │
                └────── (Many) reviews (as reviewer)

activities (1) ──┬────── (Many) bookings
                 │
                 └────── (Many) reviews

bookings (1) ───┬────── (Many) payments
                │
                └────── (1) reviews

payments (Many) ───────── (1) bookings

reviews (Many) ─────────── (1) bookings/activities/users
```

---

## Indexes

### Purpose & Strategy

1. **Foreign Keys**: All FK columns have indexes for JOIN performance
2. **Filters**: Common WHERE clause columns indexed (status, date ranges)
3. **Composites**: Multi-column indexes for common query patterns
4. **Soft Deletes**: Partial indexes with WHERE clauses to exclude deleted rows
5. **Uniqueness**: UNIQUE constraints provide automatic indexes

### Index List

| Table | Index Name | Columns | Partial | Purpose |
|-------|-----------|---------|---------|---------|
| users | idx_users_email | email | deleted_at IS NULL | Authentication/lookup |
| users | idx_users_status | status | None | Status filtering |
| activities | idx_activities_host_id | host_id | deleted_at IS NULL | Host's activities |
| activities | idx_activities_status | status | None | Status filtering |
| activities | idx_activities_category | category | deleted_at IS NULL | Browse by category |
| bookings | idx_bookings_activity_id | activity_id | None | Activity's bookings |
| bookings | idx_bookings_guest_id | guest_id | None | Guest's bookings |
| bookings | idx_bookings_status | status | None | Status filtering |
| bookings | idx_bookings_date | booking_date | None | Date filtering |
| bookings | idx_bookings_activity_date | activity_id, booking_date | None | Availability checks |
| payments | idx_payments_booking_id | booking_id | None | Booking's payments |
| payments | idx_payments_status | payment_status | None | Status filtering |
| payments | idx_payments_transaction_id | transaction_id | None | Transaction lookup |
| reviews | idx_reviews_activity_id | activity_id | None | Activity's reviews |
| reviews | idx_reviews_reviewer_id | reviewer_id | None | User's reviews |
| reviews | idx_reviews_status | status | None | Moderation filtering |
| reviews | idx_reviews_created_at | created_at | None | Chronological access |

---

## Constraints

### Data Integrity Constraints

1. **NOT NULL**: All essential fields have NOT NULL constraints
2. **UNIQUE**: Email and username (users), transaction_id (payments), booking_id (reviews)
3. **CHECK**: 
   - Quantity > 0 (bookings)
   - Amount > 0 (payments)
   - Rating between 1-5 (reviews)
4. **FOREIGN KEYS**: Referential integrity with appropriate ON DELETE rules

### Cascading Deletes

- activities → bookings, reviews (when activity deleted)
- bookings → payments, reviews (when booking deleted)
- users (reviewers) → reviews (when user deleted)

### Restricted Deletes

- users (host) ⚠️ Cannot be deleted if they have activities
- users (guest) ⚠️ Cannot be deleted if they have bookings

---

## Migration Guide

### Running Migrations

1. **Up (Apply)**
   ```bash
   psql -U postgres -d booking_db -f migrations/001_create_core_schema.up.sql
   ```

2. **Down (Rollback)**
   ```bash
   psql -U postgres -d booking_db -f migrations/001_create_core_schema.down.sql
   ```

### Migration Files Structure

```
migrations/
├── 001_create_core_schema.up.sql      # Create all tables
└── 001_create_core_schema.down.sql    # Drop all tables (rollback)
```

### Future Migrations

When adding new features:
1. Create numbered migration files (002_*, 003_*, etc.)
2. Always create both `.up.sql` and `.down.sql` versions
3. Test DOWN migrations to ensure reversibility
4. Include migration metadata comments
5. Avoid mixing schema changes with data transformations when possible

### Key Properties

✅ **Reversible** - All migrations have working DOWN scripts  
✅ **Idempotent** - Can be safely re-run  
✅ **Non-Destructive** - Soft deletes preserve data  
✅ **Atomic** - Use transactions for consistency  

---

## Security Notes

- Passwords not shown (should be in separate auth system)
- Email validation should occur at application layer
- Foreign key constraints prevent orphaned records
- Soft deletes allow audit trails
- Consider row-level security (RLS) policies for multi-tenant scenarios
