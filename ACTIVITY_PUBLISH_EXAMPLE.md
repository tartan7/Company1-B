# Activity Publishing Workflow - Example

This document shows a practical example of the complete activity publishing workflow.

## Scenario

An activity operator wants to:
1. Create an activity listing
2. Publish it to make it available to customers
3. Update the activity
4. Publish again to create a new version
5. View the complete version history

## Step-by-Step Example

### 1. Create an Activity (In Database)

First, an activity must exist in the database. Using the POST /activities endpoint:

```bash
curl -X POST http://localhost:3000/activities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mountain Peak Adventure",
    "description": "A challenging 8-hour hike to the mountain peak with breathtaking views",
    "category": "Hiking",
    "price": 150.00,
    "duration": 480,
    "location": "Rocky Mountains",
    "maxParticipants": 8
  }'
```

Response:
```json
{
  "id": "123",
  "title": "Mountain Peak Adventure",
  "description": "A challenging 8-hour hike to the mountain peak with breathtaking views",
  "category": "Hiking",
  "pricePerPerson": "150.00",
  "maxCapacity": 8,
  "duration": 480,
  "location": "Rocky Mountains",
  "hostId": "456",
  "status": "active",
  "version": 1,
  "publishedAt": null,
  "publishedBy": null,
  "createdAt": "2026-05-21T10:00:00Z",
  "updatedAt": "2026-05-21T10:00:00Z"
}
```

### 2. Publish the Activity

Publish the activity to create the first immutable snapshot (version 2):

```bash
curl -X POST http://localhost:3000/activities/123/publish \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "message": "Activity published successfully",
  "version": 2,
  "activityId": "123"
}
```

**What happens behind the scenes:**
- The current activity data is captured as an immutable snapshot
- Version is incremented from 1 to 2
- The snapshot is stored in the `resource_versions` table
- An audit log entry is created recording the publish action

### 3. View Publish History

Check all published versions:

```bash
curl -X GET http://localhost:3000/activities/123/versions \
  -H "Authorization: Bearer <token>"
```

Response:
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
    }
  ],
  "total": 1
}
```

### 4. Update the Activity

Update activity details (e.g., improve the description):

```bash
curl -X PATCH http://localhost:3000/activities/123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A challenging 8-hour hike to the mountain peak with breathtaking views. Professional guides included. All skill levels welcome."
  }'
```

Response:
```json
{
  "id": "123",
  "title": "Mountain Peak Adventure",
  "description": "A challenging 8-hour hike to the mountain peak with breathtaking views. Professional guides included. All skill levels welcome.",
  "category": "Hiking",
  "pricePerPerson": "150.00",
  "maxCapacity": 8,
  "duration": 480,
  "location": "Rocky Mountains",
  "hostId": "456",
  "status": "active",
  "version": 1,
  "publishedAt": "2026-05-21T10:30:00Z",
  "publishedBy": "456",
  "updatedAt": "2026-05-21T11:00:00Z"
}
```

**Note:** The version is still 1 because the main activity record hasn't been "published" again. The snapshot version (2) remains unchanged.

### 5. Publish Again

Publish the updated activity to create version 3:

```bash
curl -X POST http://localhost:3000/activities/123/publish \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "message": "Activity published successfully",
  "version": 3,
  "activityId": "123"
}
```

### 6. View Updated History

Check versions again to see both snapshots:

```bash
curl -X GET http://localhost:3000/activities/123/versions
```

Response:
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

## Data Model Example

### Activity Record (Current State)
```json
{
  "id": 123,
  "title": "Mountain Peak Adventure",
  "description": "A challenging 8-hour hike... Professional guides included. All skill levels welcome.",
  "category": "Hiking",
  "pricePerPerson": "150.00",
  "maxCapacity": 8,
  "duration": 480,
  "location": "Rocky Mountains",
  "hostId": 456,
  "status": "active",
  "version": 1,
  "publishedAt": "2026-05-21T11:00:00Z",
  "publishedBy": 456,
  "createdAt": "2026-05-21T10:00:00Z",
  "updatedAt": "2026-05-21T11:00:00Z"
}
```

### Version 2 Snapshot (Immutable)
```json
{
  "id": 1,
  "resourceType": "activity",
  "resourceId": 123,
  "version": 2,
  "status": "published",
  "data": {
    "id": 123,
    "title": "Mountain Peak Adventure",
    "description": "A challenging 8-hour hike to the mountain peak with breathtaking views",
    "category": "Hiking",
    "pricePerPerson": "150.00",
    "maxCapacity": 8,
    "duration": 480,
    "location": "Rocky Mountains",
    "hostId": 456,
    "status": "active",
    "version": 1,
    "createdAt": "2026-05-21T10:00:00Z",
    "updatedAt": "2026-05-21T10:00:00Z"
  },
  "publishedAt": "2026-05-21T10:30:00Z",
  "publishedBy": 456,
  "createdAt": "2026-05-21T10:30:00Z",
  "isDeleted": false
}
```

### Version 3 Snapshot (Immutable)
```json
{
  "id": 2,
  "resourceType": "activity",
  "resourceId": 123,
  "version": 3,
  "status": "published",
  "data": {
    "id": 123,
    "title": "Mountain Peak Adventure",
    "description": "A challenging 8-hour hike to the mountain peak with breathtaking views. Professional guides included. All skill levels welcome.",
    "category": "Hiking",
    "pricePerPerson": "150.00",
    "maxCapacity": 8,
    "duration": 480,
    "location": "Rocky Mountains",
    "hostId": 456,
    "status": "active",
    "version": 1,
    "createdAt": "2026-05-21T10:00:00Z",
    "updatedAt": "2026-05-21T11:00:00Z"
  },
  "publishedAt": "2026-05-21T11:00:00Z",
  "publishedBy": 456,
  "createdAt": "2026-05-21T11:00:00Z",
  "isDeleted": false
}
```

## Key Observations

1. **Version Numbers**
   - The `version` field in the activity record starts at 1
   - Each publish creates a new snapshot with an incremented version (2, 3, 4, etc.)
   - The version in the snapshot represents the "published version"

2. **Immutability**
   - Once published, snapshots cannot be modified
   - Only the current activity record can be updated
   - Previous versions are preserved exactly as they were

3. **Audit Trail**
   - Every publish is logged with who published it and when
   - Provides complete history of changes

4. **Status Management**
   - Activities start in "active" status
   - Can be set to "draft", "inactive", or "archived"
   - Only "active" and "draft" activities can be published

## Error Scenarios

### Attempting to Publish Non-Existent Activity

```bash
curl -X POST http://localhost:3000/activities/999/publish
```

Response (404):
```json
{
  "error": "Activity not found"
}
```

### Attempting to Publish Archived Activity

```bash
curl -X POST http://localhost:3000/activities/123/publish
```

Response (400):
```json
{
  "error": "Cannot publish activity with status: archived"
}
```

### Missing Authorization

```bash
curl -X POST http://localhost:3000/activities/123/publish
```

Response (401):
```json
{
  "error": "Missing authorization token"
}
```
