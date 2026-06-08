# ESC-554: Versioning & Snapshots Architecture Plan

## Executive Summary

Implement immutable snapshots and version tracking for key entities (Activities, Schedules, Bookings) to support publishing workflows. When an entity is published, create an immutable snapshot and increment the version number. Prior versions remain accessible but read-only.

## Design Goals

1. **Immutability**: Published snapshots cannot be modified
2. **Auditability**: All version changes tracked in audit logs
3. **Accessibility**: Users can view/restore previous versions
4. **Performance**: Efficient queries for current and historical versions
5. **Consistency**: Version increments atomic with status changes

## Architecture Overview

### 1. Database Schema

#### New Tables

**resource_versions** (for all versioned resources)
```
- id: BIGSERIAL PRIMARY KEY
- resource_type: VARCHAR (activity, schedule, booking)
- resource_id: BIGINT (FK to original resource)
- version: INTEGER (1, 2, 3, ...)
- status: VARCHAR ('draft', 'published', 'archived')
- data: TEXT (JSON snapshot of resource state)
- published_at: TIMESTAMP
- published_by: BIGINT (FK to users)
- created_at: TIMESTAMP
- is_deleted: BOOLEAN (soft-delete flag for published versions)

Indexes:
- (resource_type, resource_id, version)
- (resource_type, resource_id, status)
- (published_at)
```

#### Modified Tables

**activities**
- Add: `version` INTEGER DEFAULT 1
- Add: `status` VARCHAR DEFAULT 'draft' (draft, published, archived)
- Add: `published_at` TIMESTAMP NULLABLE
- Add: `published_by` BIGINT NULLABLE (FK to users)

**schedules**
- Add: `version` INTEGER DEFAULT 1
- Add: `status` VARCHAR DEFAULT 'draft' (draft, published, archived)
- Add: `published_at` TIMESTAMP NULLABLE
- Add: `published_by` BIGINT NULLABLE (FK to users)

**bookings**
- Add: `version` INTEGER DEFAULT 1
- Add: `status` VARCHAR - expand existing enum to include 'draft' (draft, pending, confirmed, cancelled, completed)
- Add: `published_at` TIMESTAMP NULLABLE
- Add: `published_by` BIGINT NULLABLE (FK to users)

### 2. Service Layer

#### SnapshotService
New service handling version management

**Methods:**
- `publishEntity(resourceType, resourceId, publishedBy)`: Create snapshot, increment version, update status
- `getVersion(resourceType, resourceId, version)`: Retrieve specific version
- `listVersions(resourceType, resourceId)`: List all versions with metadata
- `softDeleteVersion(resourceType, resourceId, version, deletedBy)`: Mark published version as deleted
- `restoreVersion(resourceType, resourceId, version, restoredBy)`: Copy version to create new draft

**Workflow:**
1. Create entity in DRAFT status (version 1)
2. User makes changes to draft
3. User publishes → SnapshotService:
   - Create immutable snapshot in resource_versions table
   - Increment version number on main table
   - Update status to PUBLISHED
   - Set published_at and published_by
   - Log to audit_logs with operation='publish'

#### Modified Services
- **ActivityService**: Delegate publish operations to SnapshotService
- **ScheduleService**: Delegate publish operations to SnapshotService
- **BookingService**: Delegate publish operations to SnapshotService

### 3. API Endpoints

#### Publish Endpoints
```
POST /api/v1/activities/:id/publish
POST /api/v1/schedules/:id/publish
POST /api/v1/bookings/:id/publish
```

Response:
```json
{
  "id": 123,
  "resourceType": "activity",
  "version": 2,
  "status": "published",
  "publishedAt": "2026-05-21T10:30:00Z",
  "publishedBy": 456
}
```

#### Version History Endpoints
```
GET /api/v1/activities/:id/versions
GET /api/v1/schedules/:id/versions
GET /api/v1/bookings/:id/versions
```

Response:
```json
{
  "resourceId": 123,
  "resourceType": "activity",
  "versions": [
    {
      "version": 2,
      "status": "published",
      "publishedAt": "2026-05-21T10:30:00Z",
      "publishedBy": 456,
      "isDeleted": false
    },
    {
      "version": 1,
      "status": "published",
      "publishedAt": "2026-05-21T09:00:00Z",
      "publishedBy": 123,
      "isDeleted": false
    }
  ]
}
```

#### Get Specific Version
```
GET /api/v1/activities/:id/versions/:version
```

Response: Full resource data for that version

#### Soft-Delete Version (Archive)
```
PATCH /api/v1/activities/:id/versions/:version/delete
```

Marks a published version as deleted without removing data.

### 4. Command Handler Pattern

Create `SnapshotCommand` handler in middleware/command layer:

```typescript
class PublishCommand {
  resourceType: string;
  resourceId: number;
  publishedBy: number;
  metadata?: Record<string, unknown>;
}

class SnapshotCommandHandler {
  async execute(command: PublishCommand): Promise<CommandResult> {
    // Validate entity exists and is in DRAFT status
    // Create snapshot
    // Increment version
    // Update status to PUBLISHED
    // Log to audit trail
    // Return result with version info
  }
}
```

### 5. Audit Logging Integration

All version operations logged to audit_logs:
- `operationType`: 'publish', 'restore', 'delete_version'
- `resourceType`: 'activity', 'schedule', 'booking'
- `resourceId`: entity ID
- `beforeState`: current version data
- `afterState`: new version data
- `description`: "Activity v2 published"

Example:
```
INSERT INTO audit_logs VALUES (
  operationType: 'publish',
  resourceType: 'activity',
  resourceId: 123,
  actorType: 'user',
  actorId: 456,
  beforeState: '{"version": 1, "status": "draft"}',
  afterState: '{"version": 2, "status": "published"}',
  description: 'Activity v2 published by user 456'
)
```

## Implementation Phases

### Phase 1: Schema & Core Service (ESC-554-1)
- Add version columns to activities, schedules, bookings
- Create resource_versions table
- Implement SnapshotService with core methods
- Add database migration

### Phase 2: Activity Publishing (ESC-554-2)
- Implement ActivityService.publish()
- Add publish validation
- Write unit tests

### Phase 3: Schedule & Booking Publishing (ESC-554-3)
- Implement ScheduleService.publish()
- Implement BookingService.publish()
- Integration tests

### Phase 4: API Endpoints (ESC-554-4)
- POST /publish endpoints
- GET /versions endpoints
- Version retrieval endpoints

### Phase 5: Command Handler & Audit (ESC-554-5)
- Implement PublishCommand and handler
- Integrate audit logging
- End-to-end tests

### Phase 6: Soft-Delete & Restore (ESC-554-6)
- Implement version soft-delete
- Implement restore functionality
- UI/API support

## Acceptance Criteria

- ✅ Publish changes status to PUBLISHED
- ✅ Version increments on each publish
- ✅ Prior versions remain accessible (read-only)
- ✅ Audit log captures all version operations
- ✅ Cannot modify published snapshots
- ✅ Version history queryable via API
- ✅ Soft-delete allows archiving versions
- ✅ Restore creates new draft from previous version
- ✅ All operations within transaction boundaries
- ✅ Unit tests for SnapshotService
- ✅ Integration tests for publish workflows

## Data Consistency

**Transaction Scopes:**
1. Publish operation: atomic update of main table + create snapshot + audit log
2. Soft-delete version: mark is_deleted + audit log
3. Restore version: copy snapshot + create new draft + audit log

**Constraints:**
- Published versions are immutable (handled by application logic)
- Draft entities only have one version
- Version numbers are sequential and immutable

## Performance Considerations

- Index on (resource_type, resource_id, version) for quick version lookups
- Index on published_at for date-range queries
- Archive old versions after retention period (future enhancement)
- Version history queries limited to last N versions in UI

## Migration Strategy

1. Create resource_versions table
2. Add version columns to existing tables (with defaults)
3. Create initial snapshots for existing published items
4. Update services to use new versioning logic
5. Update API routes
6. Backward compatibility: existing items treated as v1

## Notes

- "Draft" status allows users to modify entities before publishing
- "Published" status makes entity immutable
- "Archived" status (future) for hiding old versions
- soft-delete preserves audit trail while hiding from UI
