# Database Migrations

This directory contains all database schema migrations in version control for the booking platform.

## Migration Files

### 001_create_core_schema
- **Status**: Core schema migration
- **Created Tables**: users, activities, bookings, payments, reviews
- **ENUM Types**: user_status, activity_status, booking_status, payment_status, review_status
- **Indexes**: 17 indexes for query optimization
- **Foreign Keys**: With appropriate CASCADE/RESTRICT rules
- **Files**:
  - `001_create_core_schema.up.sql` - Apply migration
  - `001_create_core_schema.down.sql` - Rollback migration

## Running Migrations

### Apply All Migrations
```bash
# Using psql
psql -U username -d database_name -f 001_create_core_schema.up.sql

# Using migration tool (when available)
migrate -path ./migrations -database $DATABASE_URL up
```

### Rollback Last Migration
```bash
# Using psql
psql -U username -d database_name -f 001_create_core_schema.down.sql

# Using migration tool
migrate -path ./migrations -database $DATABASE_URL down
```

## Migration Principles

1. **Reversibility** - All migrations must have working DOWN scripts
2. **Idempotency** - Migrations should be safely re-runnable
3. **Non-Destructive** - Use soft deletes where appropriate
4. **Testing** - Test both UP and DOWN paths
5. **Documentation** - Include clear headers and comments
6. **Atomicity** - Wrap in transactions when needed
7. **Dependencies** - Number migrations sequentially

## Database Schema Components

### Tables (5)
- **users** - User accounts and profiles
- **activities** - Bookable experiences
- **bookings** - Guest bookings
- **payments** - Payment records
- **reviews** - User reviews and ratings

### Constraints
- 5 ENUM types for consistent status values
- Foreign key relationships with cascade rules
- CHECK constraints for data validation
- UNIQUE constraints for critical fields

### Indexes (17)
- Single-column indexes on foreign keys and status fields
- Composite index on (activity_id, booking_date) for availability
- Partial indexes excluding soft-deleted records
- All indexes named with `idx_` prefix for clarity

## Naming Conventions

- **Tables**: Snake case, singular (user, activity, booking)
- **Columns**: Snake case, descriptive names
- **Indexes**: `idx_[table]_[columns]` prefix
- **Foreign Keys**: `fk_[table]_[reference]`
- **Enums**: Snake case, full names (user_status, not u_status)
- **Constraints**: Specific type (check_*, unique_*)

## Verification Checklist

After applying migrations:
```sql
-- Verify ENUM types exist
SELECT type_name FROM information_schema.udt WHERE udt_schema='public';

-- Verify tables exist
\dt

-- Verify indexes
\di

-- Check foreign keys
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';
```

## Migration History

| Migration | Version | Date | Status |
|-----------|---------|------|--------|
| 001_create_core_schema | 001 | 2026-05-21 | ✅ Ready |

## Future Migrations Template

Create new migration file: `NNN_description.up.sql` and `NNN_description.down.sql`

```sql
-- Migration: [Descriptive Title]
-- Version: NNN
-- Purpose: [What problem does this solve]
-- Dependencies: [Any prior migrations needed]

-- UP MIGRATION (NNN_description.up.sql)
-- Your schema changes here

-- DOWN MIGRATION (NNN_description.down.sql)  
-- Reverse the above changes, must be idempotent
```
