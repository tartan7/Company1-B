# Database Migration Guide

This document describes the database migration framework and workflow for the Tourism Booking API.

## Overview

The project uses **Drizzle ORM** with **drizzle-kit** for database migrations. This provides:
- Type-safe schema definitions in TypeScript
- Automatic migration generation from schema changes
- PostgreSQL support
- Forward and reverse migrations
- Migration tracking

## Setup

### 1. Environment Configuration

Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tourism_booking"
```

For development, a `.env` file can be used:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tourism_booking
```

### 2. Initial Database Setup

Initialize the database and run all migrations:

```bash
npm run db:init
```

This command:
1. Creates the `tourism_booking` database if it doesn't exist
2. Creates a `_migrations` tracking table
3. Runs all pending migrations
4. Records executed migrations to prevent re-execution

## Migration Workflow

### Creating Migrations

Migrations are generated automatically from schema changes defined in `src/db/schema.ts`.

#### Step 1: Update the Schema

Edit `src/db/schema.ts` to add or modify tables:

```typescript
import { pgTable, bigint, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const newTable = pgTable(
  'new_table',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_new_table_name').on(table.name),
  ]
);

export type NewTable = typeof newTable.$inferSelect;
export type NewTableInsert = typeof newTable.$inferInsert;
```

#### Step 2: Generate the Migration

```bash
npm run db:generate -- "descriptive_migration_name"
```

Example:
```bash
npm run db:generate -- "add_user_preferences"
```

This creates a new SQL migration file in `src/db/migrations/` with an auto-incremented number.

#### Step 3: Review the Generated Migration

Always review the generated SQL in `src/db/migrations/`:

```sql
-- Migration content
CREATE TABLE "new_table" (
  "id" bigint PRIMARY KEY NOT NULL,
  ...
);
```

**Important**: Ensure the migration:
- Doesn't break existing data
- Has appropriate constraints and indexes
- Maintains referential integrity

#### Step 4: Run the Migration

```bash
npm run db:migrate
```

This applies all pending migrations to the connected database.

## Running Migrations

### Development Environment

```bash
# Initialize fresh database
npm run db:init

# Or run migrations on existing database
npm run db:migrate
```

### Production Deployment

Before deploying to production:

1. **Test on staging**:
   ```bash
   DATABASE_URL="<staging-db-url>" npm run db:migrate
   ```

2. **Create a backup**:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

3. **Run the migration**:
   ```bash
   npm run db:migrate
   ```

4. **Verify** the schema:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

## Migration Best Practices

### DO:
- ✅ Keep migrations small and focused
- ✅ Test migrations on a local copy first
- ✅ Update schema.ts before generating migrations
- ✅ Always review generated SQL
- ✅ Create backups before production deployments
- ✅ Use meaningful migration names
- ✅ Include constraints and indexes in initial migration

### DON'T:
- ❌ Manually edit generated SQL (regenerate instead)
- ❌ Run migrations without testing first
- ❌ Skip migration review
- ❌ Create circular foreign key dependencies
- ❌ Remove soft-delete fields without data cleanup
- ❌ Change primary keys without migration support

## Migration Examples

### Adding a New Table

1. Update `schema.ts`:
```typescript
export const activityReviews = pgTable('activity_reviews', {
  id: bigint('id', { mode: 'bigserial' }).primaryKey(),
  activityId: bigint('activity_id', { mode: 'bigint' }).notNull(),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.activityId], foreignColumns: [activities.id] })
    .onDelete('cascade'),
  index('idx_activity_reviews_activity_id').on(table.activityId),
]);
```

2. Generate:
```bash
npm run db:generate -- "add_activity_reviews"
```

3. Apply:
```bash
npm run db:migrate
```

### Adding a Column to Existing Table

1. Update the table in `schema.ts`:
```typescript
export const users = pgTable('users', {
  // ... existing fields
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en'),
});
```

2. Generate and apply the migration

### Modifying Column Types

1. Update the field type in `schema.ts`
2. Generate and review the migration (may require data conversion)
3. Apply and test

## Rollback

### Automatic Rollback on Error

If a migration fails, the transaction is automatically rolled back. No manual intervention is needed.

### Manual Rollback (Downtime)

To rollback to a previous state:

1. Restore from backup:
   ```bash
   psql $DATABASE_URL < backup.sql
   ```

2. Remove the migration file
3. Reset the migration tracking:
   ```bash
   psql $DATABASE_URL -c "DELETE FROM _migrations WHERE name = 'migration_filename';"
   ```

## Schema Structure

The database includes the following core tables:

- **users**: User accounts and profiles
- **activities**: Bookable activities/experiences
- **schedules**: Activity schedules with booking slots
- **bookings**: Booking records linking users to activities
- **payments**: Payment transaction records
- **reviews**: User reviews of activities

All tables include:
- Surrogate bigint primary keys
- `created_at` timestamp (auto-set on insert)
- `updated_at` timestamp (auto-set on update)
- Appropriate foreign keys and indexes

Core entities have soft-delete support via `deleted_at` fields.

## Troubleshooting

### Migration Tracking Issues

Check executed migrations:
```bash
psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY id;"
```

### Connection Issues

Verify the database URL:
```bash
psql $DATABASE_URL -c "\dt"
```

### Schema Mismatch

If the schema in code doesn't match the database:

1. Back up the database
2. Review recent migrations
3. Check that all schema changes are in `schema.ts`
4. Generate a corrective migration if needed

## Track 2: Service Layer Integration (ESC-470)

Real-time availability tracking and concurrent booking prevention have been implemented with the following features:

### Service Layer Changes

The ScheduleService has been rewritten to use PostgreSQL for persistence:

**Key Updates**:
- Migrated from in-memory Map storage to Drizzle ORM + PostgreSQL
- Added `async/await` to all service methods for database operations
- Implemented pessimistic locking with `SELECT...FOR UPDATE` for concurrent bookings
- Atomic slot updates prevent race conditions

**New Methods**:
- `bookSlots(scheduleId, slotsToBook)`: Atomically increment booked_slots with row locking
- `releaseSlots(scheduleId, slotsToRelease)`: Atomically decrement booked_slots with row locking

### Type System Updates

Schedule type now includes:
- `bookedSlots: number` - Count of currently booked slots
- `availableCount: number` - Calculated: totalSlots - bookedSlots
- `isFull: boolean` - Calculated: availableCount === 0

### API Endpoint Updates

All schedule endpoints now:
- Return real-time availability info in responses
- Support `availability_only=true` query parameter to filter available schedules
- Include `availableCount` and `isFull` in all schedule responses

**New Query Endpoint**:
```
GET /api/v1/schedules?activity_id=X&availability_only=true
```

### Concurrency Safeguards

1. **Row-Level Locking**: `SELECT...FOR UPDATE` prevents concurrent slot booking conflicts
2. **Database Constraints**: `CHECK (booked_slots <= total_slots)` prevents invalid states
3. **Atomic Transactions**: All slot updates within single transactions
4. **Connection Pooling**: 20-connection pool with 30s idle timeout

### Performance

Load testing verifies:
- 100+ concurrent booking attempts handled correctly
- Average response time: <10ms per request
- No race conditions or constraint violations
- Database constraint prevents overbooking at DB level

### Testing

**Concurrency Tests** (`scheduleService.concurrency.test.ts`):
- 100 concurrent bookings with 50 slots → exactly 50 succeed
- Overbooking prevention with 20 concurrent requests on 10-slot schedule
- Mixed booking/release operations maintain consistency
- Availability calculations are correct

**Load Tests** (`scheduleService.loadtest.ts`):
- Test 1: 100 concurrent 1-slot bookings on 1000-slot schedule
- Test 2: 200 concurrent 2-slot bookings 
- Test 3: Mixed 150 bookings + 75 releases concurrently
- Verifies no constraint violations and performance

Run tests:
```bash
npm test -- scheduleService.concurrency.test.ts
npm run loadtest  # custom load test script
```

## Further Reading

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [drizzle-kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DB_SETUP.md](./DB_SETUP.md) - Database infrastructure details
