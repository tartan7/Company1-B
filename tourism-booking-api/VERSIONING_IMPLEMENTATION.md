# API Versioning Implementation

## Overview
This document describes the implementation of REST API endpoints for publishing and version management across the tourism booking API. The implementation provides a generic, resource-agnostic versioning system supporting activities, schedules, and bookings.

## Implemented Endpoints

### 1. POST /api/v1/{resourceType}/:id/publish
- **Purpose**: Creates an immutable snapshot and increments the resource version
- **Authentication**: JWT required with `operator` role
- **Status Codes**: 
  - 200: Successfully published
  - 400: Invalid resource type
  - 401: Missing authentication
  - 403: Insufficient permissions (non-operator)
  - 404: Resource not found
  - 500: Server error

### 2. GET /api/v1/{resourceType}/:id/versions
- **Purpose**: Lists all versions of a resource with metadata
- **Authentication**: Not required
- **Response**: Array of version objects with timestamps and publisher info
- **Status Codes**:
  - 200: Success
  - 400: Invalid resource type
  - 404: Resource not found
  - 500: Server error

### 3. GET /api/v1/{resourceType}/:id/versions/:version
- **Purpose**: Retrieves a specific version's complete snapshot
- **Authentication**: Not required
- **Response**: Full resource data including all fields from the snapshot
- **Status Codes**:
  - 200: Success
  - 400: Invalid resource type or version number
  - 404: Resource or version not found
  - 410: Version has been deleted
  - 500: Server error

### 4. GET /api/v1/{resourceType}/:id/current-version
- **Purpose**: Gets the current version number of a resource
- **Authentication**: Not required
- **Response**: Current version number
- **Status Codes**:
  - 200: Success
  - 400: Invalid resource type
  - 404: Resource not found
  - 500: Server error

## Architecture

### File Structure
```
src/
├── routes/
│   ├── versions.ts          # Route handlers (generic for all resource types)
│   └── versions.test.ts     # Unit tests for route validation
└── services/
    └── snapshotService.ts   # Core versioning and snapshot logic
```

### Design Decisions

#### 1. Generic Route Handler
The `versions.ts` router is resource-type agnostic, supporting:
- `activity` - Tourism activities
- `schedule` - Activity schedules
- `booking` - User bookings

This eliminates code duplication and ensures consistent behavior across resource types.

#### 2. SnapshotService Integration
All versioning logic is delegated to `SnapshotService`, which:
- Manages immutable snapshots
- Handles version numbering
- Tracks publication metadata (timestamp, publisher)
- Supports soft-deletion of versions

#### 3. Authentication & Authorization
- **All endpoints require validation** of the resource type
- **Publish endpoint** requires JWT token with `operator` role
- **Read endpoints** are publicly accessible (no auth required)
- JWT verification handled by existing middleware

#### 4. Error Handling
Comprehensive error responses:
- Invalid input validation (400)
- Authentication/authorization (401/403)
- Resource not found (404)
- Deleted resources (410)
- Server errors (500)

All errors follow consistent JSON format:
```json
{ "error": "Description of the error" }
```

## Testing

### Test Coverage
The `versions.test.ts` file includes:
- Authentication validation (401 for missing token, 403 for insufficient role)
- Input validation (invalid resource types, invalid version numbers)
- Error handling across all endpoints
- Status code verification

### Running Tests
```bash
npm run build   # Compile TypeScript
npm test        # Run all tests with coverage
```

## Integration

### Route Registration
The versioning routes are mounted in `src/index.ts`:
```typescript
app.use('/api/v1', versionsRoutes);
```

This makes the endpoints available at:
- `POST /api/v1/activity/:id/publish`
- `GET /api/v1/activity/:id/versions`
- `GET /api/v1/activity/:id/versions/:version`
- `GET /api/v1/activity/:id/current-version`

(And equivalent paths for `schedule` and `booking` resource types)

## Acceptance Criteria Met

✅ **All endpoints respond correctly** - Four endpoints implemented with proper request/response handling
✅ **Proper HTTP status codes** - Complete status code coverage (200, 400, 401, 403, 404, 410, 500)
✅ **JWT authentication required** - Publish endpoint enforces operator role via middleware
✅ **Comprehensive error responses** - Descriptive error messages with consistent JSON format
✅ **Documentation provided** - API_VERSIONS.md with examples and error cases
✅ **Unit tests written** - versions.test.ts validates all endpoints and error scenarios

## Future Enhancements

1. **Rate limiting** - Add rate limits to publish endpoint
2. **Version comparison** - Endpoint to compare two versions
3. **Batch operations** - Publish multiple resources in one request
4. **Version metadata** - Track change descriptions/notes per version
5. **Rollback functionality** - Restore previous versions
6. **WebSocket notifications** - Notify clients of version changes in real-time
