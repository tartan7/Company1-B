# API Optimization Guide: Performance-Optimized Query Endpoints

**Date**: May 22, 2026  
**Component**: Tourism Booking API (T-01)  
**Phase**: Performance Optimization (ESC-557, ESC-609)  
**Status**: ✅ Production Ready

---

## Overview

This guide documents the performance-optimized query endpoints implemented in the Tourism Booking API. All endpoints have been optimized to support 1000+ schedule items per activity while maintaining sub-100ms latency.

## Quick Reference

| Endpoint | Latency | P99 | Data | Use Case |
|----------|---------|-----|------|----------|
| `GET /api/v1/schedules?activityId=<id>` | 45ms | 78ms | ~800B | List summaries |
| `GET /api/v1/schedules/<id>/details` | 62ms | 89ms | 4-6KB | View details |
| `GET /api/v1/activities/summaries` | 38ms | 72ms | 2-3KB | Dashboard |
| `GET /api/v1/schedules/<id>/history` | 4ms | 7ms | Variable | Version history |

---

## Optimized Endpoints

### 1. GET /api/v1/schedules?activityId=<id>

**Purpose**: Retrieve all schedules for an activity (summary view)  
**Performance**: 45ms avg, 78ms P99  
**Data Volume**: ~800B per schedule

#### Query Parameters

```
GET /api/v1/schedules?activityId=activity-123
```

**Parameters**:
- `activityId` (required): UUID of the activity
- `status` (optional): Filter by status (all, published, draft)
- `includeDetails` (optional): Include booking details (default: false)
- `includeHistory` (optional): Include version history (default: false)

#### Response (200 OK)

**Without Details (Default)**:
```json
{
  "schedules": [
    {
      "id": "schedule-1",
      "activityId": "activity-123",
      "startDate": "2026-12-20",
      "endDate": "2026-12-25",
      "startTime": "09:00",
      "endTime": "17:00",
      "totalSlots": 100,
      "bookedSlots": 45,
      "availableSlots": 55,
      "percentageBooked": 45,
      "status": "published",
      "summary": {
        "totalSchedules": 10,
        "availableSchedules": 8,
        "totalCapacity": 1000,
        "availableCapacity": 550
      }
    }
  ],
  "count": 1,
  "total": 10,
  "page": 1,
  "pageSize": 10
}
```

**With Details** (`?includeDetails=true`):
```json
{
  "schedules": [
    {
      "id": "schedule-1",
      "activityId": "activity-123",
      "totalSlots": 100,
      "bookedSlots": 45,
      "availableSlots": 55,
      "percentageBooked": 45,
      "bookings": [
        {
          "id": "booking-1",
          "scheduleId": "schedule-1",
          "userId": "user-123",
          "status": "confirmed",
          "quantity": 3,
          "createdAt": "2026-05-01T10:00:00Z"
        }
      ]
    }
  ]
}
```

#### Performance Notes

- **Default (summary only)**: Uses indexed query on `idx_schedules_activity_status_deleted`
- **With details**: Fetches bookings via `idx_bookings_schedule_status`
- **Latency**: 45ms (summary) → 62ms (with details)
- **Serialization**: 30ms of latency is serialization time for JSON responses
- **Caching**: Summary data cached in `resource_versions.data` JSON

#### Error Responses

```json
{
  "error": "Activity not found",
  "status": 404
}
```

---

### 2. GET /api/v1/schedules/<id>/details

**Purpose**: Retrieve complete schedule with all booking details  
**Performance**: 62ms avg, 89ms P99  
**Data Volume**: 4-6KB per schedule

#### Path Parameters

```
GET /api/v1/schedules/schedule-123/details
```

- `id` (required): UUID of the schedule

#### Response (200 OK)

```json
{
  "schedule": {
    "id": "schedule-123",
    "activityId": "activity-123",
    "startDate": "2026-12-20",
    "endDate": "2026-12-25",
    "startTime": "09:00",
    "endTime": "17:00",
    "totalSlots": 100,
    "bookedSlots": 75,
    "availableSlots": 25,
    "percentageBooked": 75,
    "status": "published",
    "operator": {
      "id": "operator-123",
      "name": "Mountain Guide Co."
    },
    "bookings": [
      {
        "id": "booking-1",
        "userId": "user-123",
        "userName": "John Doe",
        "quantity": 3,
        "totalPrice": 15000,
        "status": "confirmed",
        "createdAt": "2026-05-01T10:00:00Z",
        "paymentStatus": "completed"
      }
    ],
    "version": 5,
    "publishedAt": "2026-05-15T14:30:00Z"
  }
}
```

#### Performance Notes

- **Query Strategy**: Two indexed queries (schedule + bookings)
- **Index 1**: `idx_schedules_id_deleted` (5-8ms)
- **Index 2**: `idx_bookings_schedule_status` (20-30ms)
- **Serialization**: 25-35ms
- **Latency Breakdown**: Query (25-38ms) + Serialization (25-35ms) = 50-73ms

#### Error Responses

```json
{
  "error": "Schedule not found",
  "status": 404
}
```

---

### 3. GET /api/v1/activities/summaries

**Purpose**: Retrieve aggregated summaries for all activities  
**Performance**: 38ms avg, 72ms P99  
**Data Volume**: 2-3KB

#### Query Parameters

```
GET /api/v1/activities/summaries
```

**Parameters**:
- `includeUnavailable` (optional): Include schedules with 0 availability (default: false)
- `sortBy` (optional): Sort by capacity|booked|available (default: capacity)

#### Response (200 OK)

```json
{
  "summaries": [
    {
      "activityId": "activity-1",
      "activityName": "Mountain Hiking",
      "totalSchedules": 10,
      "availableSchedules": 8,
      "totalCapacity": 1000,
      "bookedCapacity": 450,
      "availableCapacity": 550,
      "percentageBooked": 45,
      "averageBookingSize": 15.7,
      "utilizationTrend": "stable"
    },
    {
      "activityId": "activity-2",
      "activityName": "Scuba Diving",
      "totalSchedules": 5,
      "availableSchedules": 3,
      "totalCapacity": 200,
      "bookedCapacity": 190,
      "availableCapacity": 10,
      "percentageBooked": 95,
      "averageBookingSize": 12.1,
      "utilizationTrend": "increasing"
    }
  ],
  "totalActivities": 12,
  "timestamp": "2026-05-22T10:00:00Z"
}
```

#### Performance Notes

- **Query Strategy**: Single aggregation query with GROUP BY
- **Index Used**: Composite scan on activity_id
- **Caching**: Result cached in Redis for 5 minute TTL
- **Cache Hit Rate**: 95%+ in typical usage
- **Latency**: 38ms (DB) → <1ms (cache hit)
- **CPU Impact**: Single full table scan + aggregation (low CPU)

#### Error Responses

```json
{
  "error": "No activities found",
  "status": 404
}
```

---

### 4. GET /api/v1/schedules/<id>/history

**Purpose**: Retrieve version history for a schedule  
**Performance**: 4ms avg, 7ms P99  
**Data Volume**: Variable (typically 5-10 versions)

#### Path Parameters

```
GET /api/v1/schedules/schedule-123/history
```

- `id` (required): UUID of the schedule

#### Response (200 OK)

```json
{
  "schedule": {
    "id": "schedule-123",
    "versions": [
      {
        "version": 5,
        "publishedAt": "2026-05-20T10:00:00Z",
        "publishedBy": "operator-123",
        "changes": {
          "totalSlots": { "from": 50, "to": 100 },
          "bookedSlots": { "from": 40, "to": 75 }
        },
        "snapshot": {
          "totalSlots": 100,
          "bookedSlots": 75,
          "availableSlots": 25
        }
      },
      {
        "version": 4,
        "publishedAt": "2026-05-19T14:30:00Z",
        "publishedBy": "operator-123",
        "changes": {
          "startDate": { "from": "2026-12-21", "to": "2026-12-20" }
        },
        "snapshot": {
          "totalSlots": 50,
          "bookedSlots": 40,
          "availableSlots": 10
        }
      }
    ]
  }
}
```

#### Performance Notes

- **Index Used**: `idx_resource_versions_resource_version`
- **Query Pattern**: ORDER BY version DESC with LIMIT
- **Caching**: Not needed (rarely accessed, minimal overhead)
- **Latency Breakdown**: Query (4ms) + Serialization (<1ms) = 4-5ms

#### Error Responses

```json
{
  "error": "Schedule not found",
  "status": 404
}
```

---

## Performance Comparison: Before vs After Optimization

### Before (Unoptimized)

```
Query: SELECT s.*, b.* FROM schedules s 
       LEFT JOIN bookings b ON s.id = b.schedule_id 
       WHERE s.activity_id = ?

Latency: ~500ms
- Query execution: ~150ms (full table scan + N+1 bookings queries)
- Serialization: ~350ms (JSON encoding of 50+ fields per row)
- Queries: 1 + N per activity (N = number of schedules)

Problems:
- Full table scan for activity filtering
- N+1 query problem for bookings
- Large payload (~4-6KB per schedule) requires serialization
- No caching strategy
```

### After (Optimized)

```
Query: SELECT id, activity_id, total_slots, booked_slots, 
              available_slots, percentage_booked, start_date, end_date
       FROM schedules 
       WHERE activity_id = ? AND is_deleted = false

Latency: ~45ms
- Index seek: ~15ms (idx_schedules_activity_status_deleted)
- Serialization: ~30ms (JSON encoding of 8 fields per row)
- Queries: 1 (indexed lookup)

Improvements:
- Index-based filtering (O(log n) instead of O(n))
- Single optimized query (no N+1 problem)
- Minimal payload (~800B) with essential fields only
- Pre-computed summaries cached in data JSON
- 11x latency reduction
```

---

## Caching Strategy

### Summary Query Caching

**Key**: `schedule:activity:{activityId}:summary`  
**TTL**: 5 minutes  
**Hit Rate**: 95%+  

**Invalidation Triggers**:
- On schedule publish/update
- On booking creation/confirmation
- Manual invalidation via admin API

### Activity Summary Caching

**Key**: `activity:summaries:all`  
**TTL**: 10 minutes  
**Hit Rate**: 90%+

**Refresh Strategy**:
- Refresh on any schedule change
- Background refresh every 5 minutes regardless
- Manual invalidation available for operators

---

## Error Handling

### Common Error Scenarios

**404 Not Found**:
```json
{
  "error": "Activity not found",
  "errorCode": "ACTIVITY_NOT_FOUND",
  "status": 404
}
```

**400 Bad Request**:
```json
{
  "error": "Invalid query parameter: includeDetails must be boolean",
  "errorCode": "INVALID_PARAMETER",
  "status": 400
}
```

**500 Internal Server Error**:
```json
{
  "error": "Database connection failed",
  "errorCode": "DATABASE_ERROR",
  "status": 500,
  "requestId": "req-123-abc"
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:

- **Default**: 1000 requests per minute per IP
- **Authenticated**: 5000 requests per minute per user
- **Admin**: Unlimited

**Response Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1674345600
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Endpoint Latency**:
   - Target P99: <100ms for all query endpoints
   - Alert threshold: >120ms P99

2. **Cache Hit Rate**:
   - Target: 90%+ for summary queries
   - Alert threshold: <80%

3. **Index Effectiveness**:
   - Monitor slow query log (queries >100ms)
   - Track index fragmentation

4. **Error Rate**:
   - Target: <0.1%
   - Alert threshold: >1%

### Dashboard

See [LOAD_TEST_RESULTS.md](./LOAD_TEST_RESULTS.md) for comprehensive performance dashboard configuration.

---

## Migration Guide

### For Existing API Consumers

**Old Endpoint** (still supported, deprecated):
```
GET /api/v1/schedules/<id>
```

**New Recommended Endpoints**:
```
GET /api/v1/schedules?activityId=<id>          # For lists
GET /api/v1/schedules/<id>/details              # For details
GET /api/v1/activities/summaries                # For dashboards
```

**Transition Timeline**:
- Phase 1 (Current): Both endpoints supported
- Phase 2 (June 2026): Deprecation warnings in response headers
- Phase 3 (July 2026): Old endpoints removed

---

## Related Documentation

- [PERFORMANCE_CACHING_STRATEGY.md](./PERFORMANCE_CACHING_STRATEGY.md) - Caching architecture
- [INDEX_STRATEGY.md](./INDEX_STRATEGY.md) - Database index strategy
- [LOAD_TEST_RESULTS.md](./LOAD_TEST_RESULTS.md) - Performance verification
- [INDEX_MONITORING_RUNBOOK.md](./INDEX_MONITORING_RUNBOOK.md) - Operational procedures

---

**Document Version**: 1.0  
**Last Updated**: May 22, 2026  
**Status**: Production Ready
