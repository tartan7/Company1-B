# Audit Logging System

## Overview

The audit logging system provides comprehensive tracking of all operations performed in the system. It captures:
- **Operation Type**: The type of operation (create, update, delete, sync, export, query)
- **Resource Type**: The type of resource being operated on (user, booking, schedule, activity, organization, etc.)
- **Resource ID**: The identifier of the affected resource
- **Actor**: Who performed the operation (user, system, agent, or API)
- **State Changes**: Before and after state of the resource (JSON)
- **Timestamp**: When the operation occurred
- **Description**: Human-readable description of the change

## Database Schema

### AuditLog Table

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,        -- create, update, delete, sync, export, query
  resource_type VARCHAR(100) NOT NULL,         -- user, booking, schedule, activity, etc.
  resource_id VARCHAR(255) NOT NULL,           -- ID of affected resource
  actor_type VARCHAR(50) NOT NULL DEFAULT 'user', -- user, system, agent, api
  actor_id VARCHAR(255),                       -- User ID or system identifier
  before_state TEXT,                           -- JSON: state before change
  after_state TEXT,                            -- JSON: state after change
  description TEXT,                            -- Human-readable change description
  operation_timestamp TIMESTAMP NOT NULL,      -- When operation occurred
  created_at TIMESTAMP NOT NULL DEFAULT now()  -- When log was recorded
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(operation_timestamp);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## API Endpoints

### Query Audit Logs

```
GET /api/v1/audit?startDate=2024-01-01&endDate=2024-01-31&operationType=create&resourceType=booking&limit=100&offset=0
```

**Query Parameters:**
- `startDate` (ISO 8601): Filter by operation date (inclusive)
- `endDate` (ISO 8601): Filter by operation date (inclusive)
- `operationType`: Filter by operation type (create, update, delete, sync, export, query)
- `resourceType`: Filter by resource type (user, booking, schedule, activity, etc.)
- `actorId`: Filter by actor ID (user ID or system identifier)
- `resourceId`: Filter by resource ID
- `limit`: Number of records per page (default: 100, max: 10000)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": 12345,
      "operationType": "create",
      "resourceType": "booking",
      "resourceId": "booking_123",
      "actorType": "user",
      "actorId": "user_456",
      "beforeState": null,
      "afterState": "{\"id\":\"booking_123\",\"guestId\":\"user_789\",\"scheduleId\":\"schedule_456\",\"quantity\":2,\"status\":\"pending\"}",
      "description": "Booking created: 2 slots booked for activity 123",
      "operationTimestamp": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00.123Z"
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 100,
    "offset": 0
  }
}
```

### Get Audit Log by ID

```
GET /api/v1/audit/:id
```

**Response:** Single audit log object

### Get Resource Audit History

```
GET /api/v1/audit/resource/:resourceType/:resourceId
```

Returns all audit logs for a specific resource in reverse chronological order.

**Example:**
```
GET /api/v1/audit/resource/booking/booking_123
```

### Export Audit Logs as CSV

```
GET /api/v1/audit/export/csv?startDate=2024-01-01&endDate=2024-01-31
```

**Response:** CSV file with columns:
```
id,operation_type,resource_type,resource_id,actor_type,actor_id,description,operation_timestamp,created_at
```

## Integration Guide

### Logging a Simple Create Operation

```typescript
import { AuditService } from './services/auditService';

await AuditService.logOperation({
  operationType: 'create',
  resourceType: 'booking',
  resourceId: bookingId.toString(),
  actorType: 'user',
  actorId: userId,
  afterState: {
    id: bookingId,
    guestId,
    scheduleId,
    quantity,
    status: 'pending',
  },
  description: `Booking created: ${quantity} slots booked for activity ${activityId}`,
});
```

### Logging an Update Operation

```typescript
await AuditService.logOperation({
  operationType: 'update',
  resourceType: 'booking',
  resourceId: bookingId.toString(),
  actorType: 'user',
  actorId: userId,
  beforeState: {
    id: bookingId,
    status: 'pending',
  },
  afterState: {
    id: bookingId,
    status: 'confirmed',
  },
  description: `Booking confirmed`,
});
```

### Logging a Delete/Soft-Delete Operation

```typescript
await AuditService.logOperation({
  operationType: 'delete',
  resourceType: 'schedule',
  resourceId: scheduleId,
  actorType: 'user',
  actorId: operatorId,
  beforeState: {
    id: scheduleId,
    isDeleted: false,
  },
  afterState: {
    id: scheduleId,
    isDeleted: true,
  },
  description: `Schedule deleted (soft delete)`,
});
```

### Logging Sync Operations

For Pleasanter API calls and organization sync operations:

```typescript
await AuditService.logOperation({
  operationType: 'sync',
  resourceType: 'organization',
  resourceId: orgId,
  actorType: 'system',
  actorId: 'pleasanter-sync',
  beforeState: oldOrgState,
  afterState: newOrgState,
  description: `Organization synced from Pleasanter API`,
});
```

## Retention Policy

**Default Retention:** 1 year (configurable)

The audit logs are intended to be retained for at least 1 year for compliance purposes. The system supports archival (future enhancement) but does not support deletion of audit logs - this ensures audit trail integrity.

To configure retention period, set the environment variable:
```
AUDIT_LOG_RETENTION_DAYS=365  # Default: 365 days
```

## Compliance Features

✅ **Read-Only API**: Audit logs can only be read or exported, never modified or deleted
✅ **Timestamp Tracking**: Every operation has both operation_timestamp (when it occurred) and created_at (when logged)
✅ **Actor Tracking**: All operations capture who performed them (user ID, system, agent, or API)
✅ **State Capture**: Before/after JSON snapshots enable impact analysis
✅ **CSV Export**: Full audit trail can be exported for compliance reports
✅ **Queryable**: Rich filtering by date, operation type, resource, and actor
✅ **Indexed**: Optimized for quick retrieval of audit trails

## Best Practices

1. **Log Consistently**: Always log operations in the same format across the system
2. **Include Meaningful Descriptions**: Make it easy for compliance teams to understand what happened
3. **Capture State**: Include relevant before/after state for investigation purposes
4. **Use Correct Actor Types**: Distinguish between user actions, system operations, and API calls
5. **Handle Failures Gracefully**: Audit logging failures should not block operations
6. **Regular Exports**: Periodically export audit logs for backup and archival

## Error Handling

Audit logging is designed to be non-blocking. If audit logging fails:
- The main operation succeeds
- An error is logged to console (for monitoring/alerting)
- The operation continues without waiting for the audit log

This ensures that logging failures don't impact application availability.

## Future Enhancements

- [ ] Archival to cold storage (S3, etc.) for logs older than retention period
- [ ] Audit log signing for tamper-detection
- [ ] Real-time audit event streaming
- [ ] Advanced analytics and reporting dashboard
- [ ] Integration with external SIEM/audit systems
- [ ] Automatic compliance report generation
