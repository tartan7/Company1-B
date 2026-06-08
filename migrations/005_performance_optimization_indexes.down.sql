-- Rollback: Performance Optimization Indexes
-- Version: 005
-- Removes all composite and partial indexes added for performance optimization

-- Drop schedules table optimization indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_schedules_activity_status_deleted;
DROP INDEX CONCURRENTLY IF EXISTS idx_schedules_activity_available_deleted;

-- Drop resource_versions table optimization indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_resource_versions_published;
DROP INDEX CONCURRENTLY IF EXISTS idx_resource_versions_resource_version;
DROP INDEX CONCURRENTLY IF EXISTS idx_resource_versions_published_at_resource;

-- Drop activities table optimization indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_activities_status_deleted;

-- Drop bookings table optimization indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_bookings_schedule_status;
