# Database Infrastructure Setup - Track 1

## Overview

This document outlines the PostgreSQL database infrastructure for real-time availability tracking and concurrent booking prevention (ESC-470).

## Architecture

### Connection Pool
- **Driver**: `pg` (node-postgres)
- **ORM**: Drizzle ORM (type-safe, lightweight)
- **Pool Size**: 20 max connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds

### Database Schema

#### Schedules Table
Tracks availability with booked slot counts for atomic concurrency control.

```sql
CREATE TABLE schedules (
  id VARCHAR(255) PRIMARY KEY,
  activity_id VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  total_slots INTEGER NOT NULL,
  booked_slots INTEGER NOT NULL DEFAULT 0,
  operator_id VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields**:
- `booked_slots`: Count of booked slots (incremented on booking, decremented on cancellation)
- `available_count` (calculated): `total_slots - booked_slots`
- `is_full` (calculated): `available_count === 0`

**Constraints**:
- `booked_slots <= total_slots` (enforced at database level)
- Soft delete: `is_deleted` flag (no hard deletes)

**Indexes**:
- `(activity_id, booked_slots)`: For filtering available schedules
- `(id)`: For SELECT...FOR UPDATE lock optimization
- `(is_deleted)`: For soft delete queries
- `(operator_id)`: For operator-owned schedules
- `(activity_id)`: For activity schedules

### Transaction Handling

**Concurrency Pattern**: Pessimistic Locking with SELECT...FOR UPDATE

```typescript
// Example: Book a slot
async function bookSlot(scheduleId: string, slotsToBook: number) {
  return await withTransaction(async (tx) => {
    // 1. Lock the schedule row
    const [schedule] = await tx
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .for('update'); // SELECT...FOR UPDATE

    // 2. Validate availability
    const available = schedule.totalSlots - schedule.bookedSlots;
    if (available < slotsToBook) {
      throw new Error('Insufficient available slots');
    }

    // 3. Atomically update
    await tx
      .update(schedules)
      .set({ bookedSlots: schedule.bookedSlots + slotsToBook })
      .where(eq(schedules.id, scheduleId));

    return { ...schedule, bookedSlots: schedule.bookedSlots + slotsToBook };
  });
}
```

**Guarantees**:
- No race conditions: Lock held for entire transaction
- Atomic: All-or-nothing semantics
- Consistent: Database constraints prevent invalid states
- Database-enforced: Constraint violation impossible at application level

## Setup Instructions

### Prerequisites
- PostgreSQL 12+ installed and running locally
- Environment variables configured

### 1. Configure Environment
```bash
# Create .env.local with database URL
cp .env.example .env.local
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tourism_booking" >> .env.local
```

### 2. Install Dependencies
```bash
npm install pg drizzle-orm drizzle-kit
```

### 3. Initialize Database
```bash
npm run db:init
```

This will:
- Create the `tourism_booking` database if it doesn't exist
- Run all migrations in `src/db/migrations/`
- Apply constraints and indexes

### 4. Verify Setup
```bash
# Check connection health
curl http://localhost:3000/health

# Should return: { "status": "ok", "database": "connected" }
```

## Migration Management

### Generate New Migrations
When schema changes are needed:

```bash
npm run db:generate -- migration_name
```

This creates a new migration file in `src/db/migrations/`.

### Apply Migrations
```bash
npm run db:migrate
```

## Development Workflow

### Local Development
```bash
npm run dev
```

Server starts and connects to PostgreSQL. Health check endpoint validates connection.

### Running Tests
```bash
npm test
```

Tests should:
- Use isolated test database
- Run migrations in test environment
- Verify concurrency properties
- Test constraint enforcement

## Performance Considerations

### Index Strategy
- `(activity_id, booked_slots)`: Query schedules filtered by availability
- `(id)`: Fast row lock acquisition (SELECT...FOR UPDATE)
- `(is_deleted)`: Soft delete queries
- Composite index on frequently filtered columns

### Connection Pooling
- Pool size: 20 connections (adjustable for load testing)
- Idle timeout: 30s (prevents connection leaks)
- Connection timeout: 2s (fails fast on unreachable DB)

### Lock Contention
- Row-level locks only (not table-level)
- Locks released at transaction end (typically <100ms for booking)
- No deadlocks (single schedule per transaction)

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql "postgresql://postgres:postgres@localhost:5432/tourism_booking"

# Check pool status in logs
# Look for: "connected", "idle timeout"
```

### Migration Failures
```bash
# Check migration status
drizzle-kit status

# Rollback (if supported)
# Manual rollback SQL in migrations/down files
```

### Lock Timeouts
- Increase `lock_timeout` in PostgreSQL config
- Monitor transaction duration
- Consider connection pool adjustments

## Next Steps (Track 2)

Once Track 1 is complete:
1. Rewrite ScheduleService to use database queries
2. Implement SELECT...FOR UPDATE in booking operations
3. Remove in-memory Map storage
4. Maintain backwards-compatible service API

See Track 2 issue for details.
