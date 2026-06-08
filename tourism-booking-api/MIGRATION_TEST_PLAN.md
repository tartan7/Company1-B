# Database Migration Test Plan

This document outlines the testing procedures for validating the database migration framework.

## Test Environment Setup

### Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- All npm dependencies installed: `npm install`

### Environment Configuration
```bash
# Create .env with test database URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tourism_booking_test"
```

## Test Suite

### Test 1: Fresh Database Initialization
**Purpose**: Verify migrations run successfully on a fresh database

**Steps**:
1. Ensure the test database doesn't exist:
   ```bash
   psql -U postgres -c "DROP DATABASE IF EXISTS tourism_booking_test;"
   ```

2. Initialize the database:
   ```bash
   npm run db:init
   ```

3. Verify expected output:
   - "Created database" OR "Database already exists"
   - "Migrations tracking table ready"
   - "Running migration: 0000_initial_schema.sql"
   - "✓ Completed: 0000_initial_schema.sql"
   - "✓ All migrations completed successfully"

4. Validate schema was created:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

   Expected tables:
   - activities
   - bookings
   - payments
   - reviews
   - schedules
   - users
   - _migrations

### Test 2: Schema Completeness
**Purpose**: Verify all required columns and constraints exist

**Steps**:
```bash
# Check users table structure
psql $DATABASE_URL -c "\d users"

# Expected columns: id, email, password_hash, first_name, last_name, phone, profile_image, bio, deleted_at, created_at, updated_at
# Constraints: users_email_unique

# Check foreign key constraints
psql $DATABASE_URL -c "
  SELECT constraint_name, table_name, column_name 
  FROM information_schema.key_column_usage 
  WHERE table_name IN ('activities', 'bookings', 'payments', 'reviews', 'schedules')
  ORDER BY table_name;
"

# Check indexes
psql $DATABASE_URL -c "\di"
```

**Verification Checklist**:
- [ ] All 6 tables created (users, activities, schedules, bookings, payments, reviews)
- [ ] All required columns present in each table
- [ ] All foreign key relationships established
- [ ] All indexes created (20+ total)
- [ ] All constraints in place (booked_slots check, rating range, unique email)

### Test 3: Idempotent Migrations
**Purpose**: Verify running migrations multiple times doesn't cause errors

**Steps**:
1. Run migrations again:
   ```bash
   npm run db:migrate
   ```

2. Verify output shows skipped migrations:
   ```bash
   ⊘ Skipped (already executed): 0000_initial_schema.sql
   ```

3. Verify no schema changes:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

   Output should be identical to previous test.

### Test 4: Migration Tracking
**Purpose**: Verify the _migrations table tracks executed migrations

**Steps**:
```bash
psql $DATABASE_URL -c "SELECT * FROM _migrations;"
```

**Expected Output**:
```
 id |        name         |     executed_at
----+---------------------+---------------------
  1 | 0000_initial_schema | 2026-05-21 10:30:00
(1 row)
```

### Test 5: Data Insertion and Constraints
**Purpose**: Verify constraints work correctly

**Setup - Valid Data**:
```sql
-- Insert a user
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('john@example.com', 'hash123', 'John', 'Doe');

-- Insert an activity
INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, status)
VALUES (1, 'Mountain Hiking', 'Beautiful mountain hike', 'hiking', 50.00, 'USD', 10, 120, 'Colorado', 'active');

-- Insert a schedule
INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, total_slots, operator_id)
VALUES (1, '2026-06-01', '2026-06-30', '09:00', '17:00', 5, 1);

-- Insert a booking
INSERT INTO bookings (guest_id, schedule_id, activity_id, quantity, booking_date, status)
VALUES (1, 1, 1, 2, '2026-05-21', 'pending');

-- Insert payment
INSERT INTO payments (booking_id, amount, currency, payment_method, status)
VALUES (1, 100.00, 'USD', 'credit_card', 'pending');
```

**Test - Check booked_slots Constraint**:
```sql
-- This should succeed
UPDATE schedules SET booked_slots = 4 WHERE id = 1;

-- This should FAIL (booked_slots > total_slots)
UPDATE schedules SET booked_slots = 6 WHERE id = 1;
-- Expected error: new row violates check constraint "booked_slots_le_total_slots"
```

**Test - Check Rating Constraint**:
```sql
-- This should succeed
INSERT INTO reviews (booking_id, activity_id, guest_id, rating, title, comment)
VALUES (1, 1, 1, 5, 'Great experience', 'Highly recommended');

-- This should FAIL (rating out of range)
INSERT INTO reviews (booking_id, activity_id, guest_id, rating, title)
VALUES (1, 1, 1, 10, 'Invalid rating');
-- Expected error: new row violates check constraint "rating_range"
```

**Test - Check Unique Email**:
```sql
-- This should FAIL
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('john@example.com', 'hash456', 'Jane', 'Smith');
-- Expected error: duplicate key value violates unique constraint "users_email_unique"
```

**Test - Check Foreign Key Cascade Delete**:
```sql
-- Delete the booking (should cascade to payments and reviews)
DELETE FROM bookings WHERE id = 1;

-- Verify payments and reviews were deleted
SELECT COUNT(*) FROM payments;  -- Should be 0
SELECT COUNT(*) FROM reviews;   -- Should be 0
```

### Test 6: Rollback Simulation
**Purpose**: Verify data integrity through transaction rollback

**Steps**:
```bash
# Stop during a test with intentional error
psql $DATABASE_URL -c "
BEGIN;
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('test@example.com', 'hash', 'Test', 'User');
-- Intentional error
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('test@example.com', 'hash', 'Test', 'User');
-- Transaction auto-rolls back
"
```

**Verification**:
```sql
SELECT COUNT(*) FROM users WHERE email = 'test@example.com';  -- Should be 0
```

### Test 7: Performance Baseline
**Purpose**: Establish baseline performance metrics

**Steps**:
```sql
-- Benchmark index usage
EXPLAIN ANALYZE SELECT * FROM activities WHERE host_id = 1;
EXPLAIN ANALYZE SELECT * FROM bookings WHERE guest_id = 1 AND status = 'pending';
EXPLAIN ANALYZE SELECT * FROM reviews WHERE activity_id = 1 ORDER BY rating DESC;
```

**Expected**: Index scans used (not full table scans)

## Cleanup

After testing, drop the test database:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS tourism_booking_test;"
```

## Automated Testing

For CI/CD pipelines, create a test database for each run:

```bash
#!/bin/bash

# Generate unique database name
DB_NAME="tourism_booking_test_${CI_BUILD_ID}"

# Setup
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/$DB_NAME"
npm run db:init

# Run tests
npm test

# Cleanup
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
```

## Rollback Testing Procedure

### Manual Rollback

1. **Backup current database**:
   ```bash
   pg_dump $DATABASE_URL > backup_before_rollback.sql
   ```

2. **Verify backup integrity**:
   ```bash
   pg_restore --list backup_before_rollback.sql | head -20
   ```

3. **Reset to previous state**:
   ```bash
   # Drop and recreate database
   psql -U postgres -c "DROP DATABASE IF EXISTS tourism_booking_test;"
   psql -U postgres -c "CREATE DATABASE tourism_booking_test;"
   
   # Manually restore previous schema or use version control
   ```

4. **Verify rollback**:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

## Performance Testing

### Query Performance

```sql
-- Users table performance
SELECT * FROM users WHERE email = 'john@example.com';
-- Expected: Seq Scan on idx_users_email index

-- Activities by category
SELECT * FROM activities WHERE category = 'hiking' ORDER BY created_at DESC;
-- Expected: uses idx_activities_category

-- Bookings by status
SELECT * FROM bookings WHERE status = 'pending' AND guest_id = 1;
-- Expected: efficient index scan

-- Reviews by activity
SELECT AVG(rating) FROM reviews WHERE activity_id = 1;
-- Expected: uses idx_reviews_activity_id
```

## Success Criteria

All tests must pass:
- ✅ Fresh database initializes successfully
- ✅ All 6 tables created with correct structure
- ✅ All constraints enforced
- ✅ Foreign keys cascade correctly
- ✅ Indexes are used in queries
- ✅ Migrations are idempotent
- ✅ No errors on re-running migrations
- ✅ Data integrity maintained through transactions

## Documentation

After successful testing, update:
1. README.md with database setup instructions
2. Deployment guides with migration procedures
3. On-call docs with troubleshooting procedures
