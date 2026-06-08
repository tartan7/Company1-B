# Activity Publishing Service Implementation

## Overview

This document describes the implementation of the Activity Publishing Service with version management for ESC-576.

## Architecture

### Core Components

1. **ActivityService** (`src/services/activityService.ts`)
   - Maintains backward compatibility with existing in-memory activity operations
   - Adds new database-backed publishing functionality:
     - `publishActivity()`: Publishes an activity and creates an immutable snapshot
     - `getActivity()`: Retrieves activity from database
     - `getActivityVersion()`: Retrieves a specific version snapshot
     - `listActivityVersions()`: Lists all versions of an activity

2. **SnapshotService** (`src/services/snapshotService.ts`)
   - Already implemented and tested
   - Handles atomic version management
   - Creates immutable snapshots in `resource_versions` table
   - Supports activities, schedules, and bookings

3. **Activity Routes** (`src/routes/activities.ts`)
   - `POST /activities/:id/publish`: Publishes an activity
   - `GET /activities/:id/versions`: Lists all versions of an activity
   - `GET /activities/:id`: Fetches activity from database
   - Existing routes for create, update, delete maintain backward compatibility

## Implementation Details

### Publishing Workflow

1. **Validation**
   - Verify activity exists in database
   - Verify activity status is 'active' or 'draft' (not 'archived' or other invalid states)

2. **Snapshot Creation**
   - Delegate to `SnapshotService.publishEntity()`
   - Creates immutable snapshot in `resource_versions` table
   - Version is incremented atomically

3. **Audit Logging**
   - All publish operations are logged to `audit_logs` table
   - Includes before/after state and actor information

### Database Schema

The implementation relies on existing database tables:

- **activities**: Stores activity records
  - `id`: Unique identifier (bigint)
  - `status`: Current status ('active', 'draft', 'archived', 'inactive')
  - `version`: Current version number
  - `publishedAt`: When activity was last published
  - `publishedBy`: User who published it

- **resource_versions**: Stores immutable snapshots
  - `resourceType`: 'activity', 'schedule', or 'booking'
  - `resourceId`: Reference to activity id
  - `version`: Version number
  - `status`: 'draft', 'published', or 'archived'
  - `data`: Complete JSON snapshot of resource
  - `publishedAt`: Timestamp of publication
  - `publishedBy`: User ID who published

- **audit_logs**: Stores audit trail
  - Records all publish operations
  - Includes before/after state

## API Endpoints

### POST /activities/:id/publish
Publishes an activity, creating an immutable snapshot and incrementing version.

**Request**
```
POST /activities/123/publish
Authorization: Bearer <token>
```

**Response (Success)**
```json
{
  "message": "Activity published successfully",
  "version": 2,
  "activityId": "123"
}
```

**Response (Failure - 404)**
```json
{
  "error": "Activity not found"
}
```

**Response (Failure - 400)**
```json
{
  "error": "Cannot publish activity with status: archived"
}
```

### GET /activities/:id/versions
Lists all published versions of an activity.

**Request**
```
GET /activities/123/versions
```

**Response**
```json
{
  "activityId": "123",
  "versions": [
    {
      "version": 2,
      "status": "published",
      "publishedAt": "2026-05-21T10:30:00Z",
      "publishedBy": "456",
      "isDeleted": false
    },
    {
      "version": 3,
      "status": "published",
      "publishedAt": "2026-05-21T11:00:00Z",
      "publishedBy": "456",
      "isDeleted": false
    }
  ],
  "total": 2
}
```

### GET /activities/:id
Fetches activity from database.

**Request**
```
GET /activities/123
```

**Response**
```json
{
  "id": "123",
  "title": "Amazing Adventure",
  "description": "Experience the wilderness",
  "category": "Adventure",
  "pricePerPerson": "99.99",
  "currency": "USD",
  "maxCapacity": 10,
  "duration": 60,
  "location": "Mountain Valley",
  "version": 3,
  "status": "active",
  "publishedAt": "2026-05-21T11:00:00Z",
  "publishedBy": "456"
}
```

## Key Features

### Immutable Snapshots
- Each publish creates an immutable copy of the activity data
- Snapshots are never modified or deleted (only soft-deleted)
- Complete state is preserved for audit and restore purposes

### Atomic Version Management
- Version incrementing happens atomically with snapshot creation
- Uses database transactions to ensure consistency
- No possibility of duplicate versions or skipped versions

### Validation
- Activities must exist before publishing
- Activities must be in a valid status ('active' or 'draft')
- Prevents publishing archived or invalid activities

### Audit Trail
- All publish operations are logged
- Includes actor, timestamp, before/after state
- Enables complete history of activity changes

## Testing

Two comprehensive test files are included:

1. **activityService.publish.test.ts**
   - Unit tests for ActivityService publishing methods
   - Tests snapshot creation, version management, validation
   - Tests audit logging integration
   - Tests version history retrieval

2. **activities.publish.test.ts**
   - Integration tests for HTTP endpoints
   - Tests authentication and authorization
   - Tests full publish workflow
   - Tests version listing and activity retrieval

## Backward Compatibility

The implementation maintains full backward compatibility:

- Legacy in-memory activity operations continue to work
- Existing routes (create, update, delete, search) unchanged
- New database-backed methods are separate and explicit
- No breaking changes to existing APIs

## Example Usage

### Publishing an Activity

```typescript
// Publish an activity
const result = await ActivityService.publishActivity('123', 'userId');

if (result.success) {
  console.log(`Activity published - version ${result.version}`);
} else {
  console.error(`Publish failed: ${result.error}`);
}
```

### Retrieving Version History

```typescript
// Get all versions
const versions = await ActivityService.listActivityVersions('123');

// Get a specific version
const snapshot = await ActivityService.getActivityVersion('123', 2);
console.log(snapshot.data.title); // Original activity data from version 2
```

## Future Enhancements

Potential improvements for future iterations:

1. **Read-only Enforcement**: Implement middleware to prevent modification of published activities
2. **Draft Workflows**: Create new draft versions when publishing existing versions
3. **Bulk Publishing**: Support publishing multiple activities at once
4. **Version Comparison**: Add ability to compare between versions
5. **Restore from Snapshot**: Implement restore functionality for archived versions
