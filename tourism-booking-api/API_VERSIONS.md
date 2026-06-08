# API Versioning Endpoints

This document describes the REST API endpoints for publishing and version management across all resource types (activities, schedules, bookings).

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The `/publish` endpoint additionally requires the `operator` role.

## Error Responses

All errors return appropriate HTTP status codes:

- **400 Bad Request**: Invalid input parameters or resource type
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User lacks required permissions (e.g., not an operator)
- **404 Not Found**: Resource or version not found
- **410 Gone**: Version has been soft-deleted
- **500 Internal Server Error**: Server-side error

Error response format:
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Endpoints

### 1. POST /api/v1/{resourceType}/:id/publish

Publishes a resource by creating an immutable snapshot and incrementing the version.

**Authentication**: Required (operator role)

**Path Parameters**:
- `resourceType` (string): Type of resource - `activity`, `schedule`, or `booking`
- `id` (string): Unique identifier of the resource

**Request Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response** (200 OK):
```json
{
  "message": "activity published successfully",
  "version": 2,
  "resourceId": "1"
}
```

**Error Cases**:
- 400: Invalid resource type
- 401: Missing authentication token
- 403: User is not an operator
- 404: Resource not found
- 500: Failed to publish resource

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/activity/123/publish \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

---

### 2. GET /api/v1/{resourceType}/:id/versions

Lists all versions of a resource, including metadata about each version.

**Authentication**: Not required

**Path Parameters**:
- `resourceType` (string): Type of resource - `activity`, `schedule`, or `booking`
- `id` (string): Unique identifier of the resource

**Response** (200 OK):
```json
{
  "resourceType": "activity",
  "resourceId": "123",
  "versions": [
    {
      "version": 1,
      "status": "published",
      "publishedAt": "2024-05-21T10:30:00.000Z",
      "publishedBy": 1,
      "isDeleted": false
    },
    {
      "version": 2,
      "status": "published",
      "publishedAt": "2024-05-21T11:45:00.000Z",
      "publishedBy": 1,
      "isDeleted": false
    }
  ],
  "total": 2
}
```

**Error Cases**:
- 400: Invalid resource type
- 404: Resource not found
- 500: Failed to fetch versions

**Example**:
```bash
curl http://localhost:3000/api/v1/activity/123/versions
```

---

### 3. GET /api/v1/{resourceType}/:id/versions/:version

Retrieves the complete snapshot of a specific version.

**Authentication**: Not required

**Path Parameters**:
- `resourceType` (string): Type of resource - `activity`, `schedule`, or `booking`
- `id` (string): Unique identifier of the resource
- `version` (number): Version number to retrieve (must be positive integer)

**Response** (200 OK):
```json
{
  "resourceType": "activity",
  "resourceId": "123",
  "version": 1,
  "status": "published",
  "data": {
    "id": 123,
    "title": "Mountain Hiking Tour",
    "description": "Experience stunning mountain views",
    "category": "adventure",
    "location": "Colorado",
    "price": 99.99,
    "duration": 8,
    "maxParticipants": 20,
    "createdAt": "2024-05-21T10:00:00.000Z",
    "updatedAt": "2024-05-21T10:30:00.000Z",
    "status": "published"
  },
  "publishedAt": "2024-05-21T10:30:00.000Z",
  "publishedBy": 1
}
```

**Error Cases**:
- 400: Invalid resource type or invalid version number
- 404: Resource or version not found
- 410: Version has been soft-deleted
- 500: Failed to fetch version

**Example**:
```bash
curl http://localhost:3000/api/v1/activity/123/versions/1
```

---

### 4. GET /api/v1/{resourceType}/:id/current-version

Retrieves the current version number of a resource.

**Authentication**: Not required

**Path Parameters**:
- `resourceType` (string): Type of resource - `activity`, `schedule`, or `booking`
- `id` (string): Unique identifier of the resource

**Response** (200 OK):
```json
{
  "resourceType": "activity",
  "resourceId": "123",
  "currentVersion": 3
}
```

**Error Cases**:
- 400: Invalid resource type
- 404: Resource not found
- 500: Failed to retrieve version information

**Example**:
```bash
curl http://localhost:3000/api/v1/activity/123/current-version
```

---

## Supported Resource Types

The versioning endpoints work with the following resource types:

| Resource Type | Description |
|---|---|
| `activity` | Booking activities like tours, classes, experiences |
| `schedule` | Activity schedules and availability |
| `booking` | Customer bookings and reservations |

---

## Version Status

Each version has a `status` field indicating its state:

- **published**: The version is published and immutable
- **draft**: The version is a work in progress (not a published version)

---

## Best Practices

1. **Use proper authentication**: Always include a valid JWT token when making requests to protected endpoints
2. **Handle version not found**: When requesting a specific version, handle 404 responses gracefully
3. **Check deleted versions**: The 410 status code indicates a soft-deleted version; treat as unavailable
4. **Pagination**: When listing versions, be prepared to handle large version histories
5. **Audit trail**: Integrate with the audit service to track who published what and when

---

## Rate Limiting

Currently, no rate limiting is enforced on these endpoints. However, this may be added in future versions.

---

## Changelog

### Version 1.0 (2024-05-21)
- Initial implementation of versioning endpoints
- Support for activities, schedules, and bookings
- Comprehensive error handling and validation
