-- Rollback: Remove versioning and snapshots support
-- Version: 004

-- Drop indexes
DROP INDEX IF EXISTS idx_activities_version;
DROP INDEX IF EXISTS idx_schedules_version;
DROP INDEX IF EXISTS idx_bookings_version;
DROP INDEX IF EXISTS idx_resource_versions_is_deleted;
DROP INDEX IF EXISTS idx_resource_versions_published_at;
DROP INDEX IF EXISTS idx_resource_versions_type_id_status;
DROP INDEX IF EXISTS idx_resource_versions_type_id;

-- Drop resource_versions table
DROP TABLE IF EXISTS resource_versions;

-- Remove versioning columns from activities
ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS fk_activities_published_by,
  DROP COLUMN IF EXISTS published_by,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS version;

-- Remove versioning columns from schedules
ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS fk_schedules_published_by,
  DROP COLUMN IF EXISTS published_by,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS version;

-- Remove versioning columns from bookings
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS fk_bookings_published_by,
  DROP COLUMN IF EXISTS published_by,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS version;
