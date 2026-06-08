# Index Maintenance & Monitoring Runbook

## Quick Reference

**Monitoring Commands**:
- Check slow queries: `SELECT * FROM pg_stat_statements WHERE query_time > 50;`
- Check index fragmentation: `REINDEX INDEX idx_name;` (if >20% fragmented)
- Update statistics: `ANALYZE schedules, bookings;`

**Alert Thresholds**:
- P99 Latency > 150ms → Investigate immediately
- Error rate > 2% → Check database connectivity
- Index fragmentation > 20% → REINDEX required

---

## Daily Maintenance (5 minutes)

### 1. Check Slow Query Log
```sql
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query_time > 50 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Action if found**:
- Queries on schedules/bookings > 50ms? Check index usage
- Queries on resource_versions > 100ms? Consider materialized view

### 2. Monitor Active Connections
```sql
SELECT count(*) FROM pg_stat_activity 
WHERE state != 'idle' AND datname = 'tourism_api';
```

**Healthy**: < max_connections / 2  
**Warning**: > 60 connections active  
**Critical**: > 75 connections (max pool size)

### 3. Check for Idle Transactions
```sql
SELECT pid, now() - pg_stat_activity.query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND duration > interval '5 minutes';
```

**Action**: Kill idle transactions over 5 minutes: `SELECT pg_terminate_backend(pid);`

---

## Weekly Maintenance (30 minutes, Sunday 2am UTC)

### 1. Rebuild Fragmented Indexes
```sql
-- Check fragmentation
SELECT schemaname, tablename, indexname,
  ROUND(100.0 * (pg_relation_size(indexrelid) - 
         pg_relation_size(indexrelid, 'main')) / 
         pg_relation_size(indexrelid), 2) AS frag_ratio
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY frag_ratio DESC;

-- Rebuild if frag_ratio > 20%
REINDEX INDEX CONCURRENTLY idx_schedules_activity_deleted;
REINDEX INDEX CONCURRENTLY idx_schedules_id_deleted;
REINDEX INDEX CONCURRENTLY idx_bookings_schedule_deleted;
```

### 2. Update Table Statistics
```sql
-- Update statistics for query planner
ANALYZE schedules;
ANALYZE bookings;
ANALYZE resource_versions;

-- Verify statistics
SELECT schemaname, tablename, n_live_tup, n_dead_tup, 
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY dead_ratio DESC;
```

### 3. Vacuum Operations (if needed)
```sql
-- Manual vacuum if dead_ratio > 20%
VACUUM (ANALYZE) schedules;
VACUUM (ANALYZE) bookings;

-- Autovacuum is preferred - check if enabled:
SHOW autovacuum;  -- Should be 'on'
```

### 4. Review Performance Trends
```sql
-- Compare weekly performance
WITH week_ago AS (
  SELECT 
    query_class,
    avg(p99_latency) as avg_p99,
    avg(error_rate) as avg_errors
  FROM performance_metrics
  WHERE timestamp > now() - interval '7 days'
  GROUP BY query_class
)
SELECT * FROM week_ago;
```

**Action if regression**:
- P99 latency increased > 10%? Investigate indexes
- Error rate increased > 50%? Check database logs

---

## Monthly Maintenance (1 hour, First Sunday 2am UTC)

### 1. Full Index Analysis
```sql
-- Generate index usage report
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Identify unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Action**:
- Unused indexes > 1MB? Consider removing
- High-usage indexes not CONCURRENT? Rebuild during low-traffic window

### 2. Capacity Planning
```sql
-- Project table growth
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  (SELECT count(*) FROM schedules) AS schedule_count,
  (SELECT count(*) FROM bookings) AS booking_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Growth rate analysis**:
- If schedules growing > 1000/day: May need partitioning at 1M rows
- If bookings > 10M rows: Consider archive strategy

### 3. Database Bloat Analysis
```sql
-- Estimate bloat in tables
SELECT 
  schemaname,
  tablename,
  round(100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - 
         pg_relation_size(schemaname||'.'||tablename)) / 
         pg_total_relation_size(schemaname||'.'||tablename), 2) AS bloat_ratio
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bloat_ratio DESC;
```

**Action if bloat > 30%**:
- Schedule VACUUM FULL during maintenance window
- Consider table rebuild: `CLUSTER tablename USING indexname`

### 4. Index Strategy Review
```sql
-- Check if indexes match queries
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%schedules%'
  AND mean_time > 50
ORDER BY mean_time DESC
LIMIT 20;
```

**Action if slow queries without indexes**:
1. Analyze query with `EXPLAIN (ANALYZE, BUFFERS)`
2. Propose new index to team lead
3. Create index CONCURRENTLY: `CREATE INDEX CONCURRENTLY idx_new ON table(col)`

---

## Performance Troubleshooting

### Scenario: Summary Endpoint Latency > 150ms

**Step 1: Identify bottleneck**
```sql
-- Time query execution
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM schedules 
WHERE activity_id = 100 
  AND is_deleted = false;
```

**Step 2: Check index**
```sql
-- Verify index is being used
SELECT * FROM pg_stat_user_indexes 
WHERE indexname = 'idx_schedules_activity_deleted';
```

**Step 3: Resolve**
- If idx_scan = 0: Index not used, rebuild: `REINDEX INDEX idx_schedules_activity_deleted;`
- If execution time > 50ms: Fragmentation issue, `REINDEX CONCURRENTLY`
- If execution time OK but total > 100ms: Serialization delay, check network

### Scenario: Detail Endpoint Timeout (>200ms)

**Step 1: Check booking query**
```sql
-- How many bookings?
SELECT schedule_id, count(*) 
FROM bookings 
WHERE schedule_id IN (SELECT id FROM schedules LIMIT 10)
GROUP BY schedule_id;
```

**Step 2: Optimize if needed**
```sql
-- Add pagination to bookings:
SELECT * FROM bookings 
WHERE schedule_id = $1 
  AND is_deleted = false 
LIMIT 100 OFFSET 0;
```

**Step 3: Verify index on bookings.schedule_id**
```sql
EXPLAIN (ANALYZE) 
SELECT * FROM bookings 
WHERE schedule_id = 12345;
```

### Scenario: Activity Summary Queries Slow (>100ms)

**Step 1: Check table statistics**
```sql
SELECT last_vacuum, last_autovacuum 
FROM pg_stat_user_tables 
WHERE relname = 'schedules';
```

**Step 2: Force statistics update**
```sql
ANALYZE schedules;
```

**Step 3: Parallelize aggregations**
```sql
-- Use thread pool for per-activity aggregations
-- Instead of sequential queries, run them concurrently
```

---

## Alert Response Playbook

### Alert: "P99 Latency > 150ms"

1. **Immediate** (< 2 minutes):
   - Check `pg_stat_activity` for long-running queries
   - Kill queries > 30 seconds: `SELECT pg_terminate_backend(pid);`

2. **Short-term** (< 15 minutes):
   - Run ANALYZE on affected tables
   - Check for missing indexes with EXPLAIN ANALYZE
   - Restart connection pool if stuck connections

3. **Follow-up** (< 1 hour):
   - Review slow query log
   - Identify root cause (missing index, bloated table, etc)
   - Create action item for fix

### Alert: "Error Rate > 2%"

1. **Immediate**:
   - Check database connectivity: `psql $DATABASE_URL -c "SELECT 1;"`
   - Check connection pool status
   - Look at application error logs

2. **Short-term**:
   - Restart database if hung connections
   - Restart application servers to clear stale pools
   - Check for schema changes

3. **Follow-up**:
   - Analyze error types (timeout, connection refused, etc)
   - Check for cascading failures
   - Review capacity

---

## Maintenance Checklist

### Daily ✓
- [ ] Review slow query log (> 50ms queries)
- [ ] Check active connection count (< 60)
- [ ] Kill idle transactions (> 5 min)
- [ ] Verify no critical errors in logs

### Weekly ✓
- [ ] REINDEX fragmented indexes (frag > 20%)
- [ ] ANALYZE tables (update statistics)
- [ ] VACUUM if dead ratio > 20%
- [ ] Review performance trends
- [ ] Check for regressions

### Monthly ✓
- [ ] Full index analysis (scan counts)
- [ ] Remove unused indexes
- [ ] Capacity planning (growth rate)
- [ ] Database bloat analysis
- [ ] Index strategy review
- [ ] Plan next optimizations

---

## Performance Baseline

### Expected Latencies (Normal Load)

- Summary query (1000 items): 40-60ms
- Detail query (with bookings): 60-80ms
- Activity summary (5 activities): 35-50ms
- Concurrent users (100): <10% latency increase

### Expected Error Rates

- Normal: <0.5% (mostly timeouts at extreme load)
- Warning: 0.5-2% (connection pool issue or slow DB)
- Critical: >2% (service degradation)

### Expected Index Fragmentation

- Healthy: <5%
- Acceptable: 5-20%
- Action required: >20%

---

## Escalation Path

**Team Lead** - Slow query optimization, index creation  
**Database Admin** - REINDEX, VACUUM, capacity planning  
**On-call Engineer** - Alert response, temporary fixes  
**DevOps** - Database restart, resource allocation  

---

## Resources

- PostgreSQL Index Documentation: https://www.postgresql.org/docs/current/indexes.html
- pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- EXPLAIN ANALYZE Guide: https://www.postgresql.org/docs/current/sql-explain.html
- Vacuum & Analyze: https://www.postgresql.org/docs/current/sql-vacuum.html

---

**Last Updated**: 2026-05-22  
**Next Review**: 2026-06-22  
**Maintained By**: CTO
