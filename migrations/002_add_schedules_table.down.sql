-- Rollback: Drop schedules table
-- Version: 002

-- Drop indexes (automatically cleaned up when table dropped, but explicit for clarity)
DROP INDEX IF EXISTS idx_schedules_active;
DROP INDEX IF EXISTS idx_schedules_availability;
DROP INDEX IF EXISTS idx_schedules_date_range;
DROP INDEX IF EXISTS idx_schedules_operator_id;
DROP INDEX IF EXISTS idx_schedules_activity_id;

-- Drop table (cascades to any dependent constraints)
DROP TABLE IF EXISTS schedules;
