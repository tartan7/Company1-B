-- Performance Index Test and Benchmarking Script
-- Purpose: Verify indexes are created and test query performance <100ms target

-- ============================================================================
-- PART 1: VERIFY INDEXES WERE CREATED
-- ============================================================================

-- List all new indexes created for performance optimization
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND (tablename IN ('schedules', 'activities', 'bookings', 'resource_versions'))
  AND indexname NOT IN (
    'idx_activities_host_id',
    'idx_activities_status',
    'idx_activities_deleted_at',
    'idx_activities_category',
    'idx_activities_version',
    'idx_schedules_activity_id',
    'idx_schedules_activity_booked_slots',
    'idx_schedules_operator_id',
    'idx_schedules_is_deleted',
    'idx_schedules_start_date',
    'idx_schedules_version',
    'idx_bookings_guest_id',
    'idx_bookings_schedule_id',
    'idx_bookings_activity_id',
    'idx_bookings_status',
    'idx_bookings_booking_date',
    'idx_bookings_version',
    'idx_resource_versions_type_id',
    'idx_resource_versions_type_id_status',
    'idx_resource_versions_published_at',
    'idx_resource_versions_is_deleted'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 2: QUERY PERFORMANCE TESTS
-- ============================================================================

-- TEST 1: Summary query for 1000+ schedules (should use idx_schedules_activity_status_deleted)
-- Target: <100ms for full activity with 1000+ schedule items
EXPLAIN ANALYZE
SELECT
  s.id,
  s.activity_id,
  s.total_slots,
  s.booked_slots,
  (s.total_slots - s.booked_slots) as available_slots,
  ROUND((s.booked_slots::float / s.total_slots * 100), 2) as percentage_booked,
  s.start_date,
  s.start_time
FROM schedules s
WHERE s.activity_id = $1
  AND s.status = 'draft'
  AND s.is_deleted = FALSE
ORDER BY s.start_date ASC
LIMIT 1000;

-- TEST 2: Published version lookup (should use idx_resource_versions_published)
-- Target: <10ms for single version lookup
EXPLAIN ANALYZE
SELECT
  id,
  version,
  status,
  data,
  published_at
FROM resource_versions
WHERE resource_type = 'schedule'
  AND resource_id = $2
  AND version = $3
  AND is_deleted = FALSE
  AND status = 'published'
LIMIT 1;

-- TEST 3: Activity filtering by status (should use idx_activities_status_deleted)
-- Target: <50ms for filtering and aggregation
EXPLAIN ANALYZE
SELECT
  a.id,
  a.title,
  COUNT(DISTINCT s.id) as total_schedules,
  COUNT(DISTINCT CASE WHEN (s.total_slots - s.booked_slots) > 0 THEN s.id END) as available_schedules,
  SUM(s.total_slots) as total_capacity
FROM activities a
LEFT JOIN schedules s ON a.id = s.activity_id AND s.is_deleted = FALSE
WHERE a.status = 'active'
  AND a.deleted_at IS NULL
GROUP BY a.id
LIMIT 100;

-- TEST 4: Availability filtering for lazy load (should use idx_schedules_activity_available_deleted)
-- Target: <50ms for finding available slots
EXPLAIN ANALYZE
SELECT
  s.id,
  s.activity_id,
  s.total_slots,
  s.booked_slots,
  (s.total_slots - s.booked_slots) as available_slots
FROM schedules s
WHERE s.activity_id = $4
  AND s.is_deleted = FALSE
  AND s.booked_slots < s.total_slots
ORDER BY s.start_date ASC
LIMIT 100;

-- TEST 5: Version history with published_at range (should use idx_resource_versions_published_at_resource)
-- Target: <30ms for historical version queries
EXPLAIN ANALYZE
SELECT
  id,
  resource_type,
  resource_id,
  version,
  published_at
FROM resource_versions
WHERE resource_type = 'schedule'
  AND published_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND is_deleted = FALSE
ORDER BY published_at DESC
LIMIT 100;

-- ============================================================================
-- PART 3: INDEX USAGE STATISTICS
-- ============================================================================

-- View current index usage statistics (run after benchmarks)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  ROUND(100 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2) as fetch_rate
FROM pg_stat_user_indexes
WHERE tablename IN ('schedules', 'activities', 'bookings', 'resource_versions')
ORDER BY idx_scan DESC;

-- Check for unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND tablename IN ('schedules', 'activities', 'bookings', 'resource_versions')
ORDER BY pg_relation_size(indexrelid) DESC;
