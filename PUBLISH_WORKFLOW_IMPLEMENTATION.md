# Schedule & Booking Publishing Services Implementation

## Summary
Extended Schedule and Booking services with publish workflows using the existing SnapshotService pattern. Published items are immutable and version-controlled through snapshots.

## Changes Made

### 1. ScheduleService Extension
**File:** `src/services/scheduleService.ts`

- Added import of SnapshotService and PublishResult interface
- Implemented `publishSchedule(scheduleId: string, publishedBy: string): Promise<PublishResult>`
  - Validates schedule exists and is not deleted
  - Validates required fields (activityId, startDate, endDate, startTime, endTime, totalSlots)
  - Delegates to SnapshotService.publishEntity()
  - Returns version and resourceId on success
- Added immutability check in `updateSchedule()` to prevent updates to published schedules
  - Throws error if attempting to update published schedule

### 2. BookingService Extension
**File:** `src/services/bookingService.ts`

- Added import of SnapshotService and PublishResult interface
- Implemented `publishBooking(bookingId: bigint, publishedBy: string): Promise<PublishResult>`
  - Validates booking exists
  - Validates booking status is 'confirmed' (only confirmed bookings can be published)
  - Validates required fields (guestId, scheduleId, activityId, quantity, bookingDate)
  - Delegates to SnapshotService.publishEntity()
  - Returns version and resourceId on success
- Added immutability check in `cancelBooking()` to prevent cancellation of published bookings
  - Returns BOOKING_IMMUTABLE error if attempting to cancel published booking

### 3. API Routes

#### Schedule Publish Route
**File:** `src/routes/schedules.ts`

- Added `POST /api/v1/schedules/:id/publish` endpoint
  - Requires authentication via verifyToken and requireOperator middleware
  - Calls ScheduleService.publishSchedule()
  - Returns version and resourceId on success
  - Returns 404 if schedule not found, 400 for validation errors
  - Returns 500 for server errors

#### Booking Publish Route
**File:** `src/routes/bookings.ts`

- Added `POST /api/v1/bookings/:id/publish` endpoint
  - Requires authentication via verifyToken middleware
  - Verifies user ownership (can only publish own bookings)
  - Calls BookingService.publishBooking()
  - Returns version and resourceId on success
  - Returns 403 if not booking owner
  - Returns 404 if booking not found, 400 for validation errors
  - Returns 500 for server errors

### 4. Comprehensive Tests
**File:** `src/services/publishWorkflow.test.ts`

Implemented tests for:
- Schedule publishing with version increment
- Schedule snapshot storage in resource_versions table
- Prevention of updates to published schedules
- Booking publishing for confirmed bookings only
- Booking version increment
- Prevention of cancellation of published bookings
- Validation that only confirmed bookings can be published
- Version history maintenance via SnapshotService
- Specific version snapshot retrieval

## Validation Rules

### Schedule Publishing
- Schedule must exist and not be deleted
- Required fields: activityId, startDate, endDate, startTime, endTime, totalSlots

### Booking Publishing
- Booking must exist
- Booking must be in 'confirmed' status
- Required fields: guestId, scheduleId, activityId, quantity, bookingDate

### Published Item Immutability
- Published schedules: Cannot be updated via PATCH endpoint
- Published bookings: Cannot be cancelled

## Snapshots & Versioning

Both services leverage the existing SnapshotService:
- Each publish operation creates an immutable snapshot in resource_versions table
- Version field increments on each publish
- publishedAt and publishedBy fields are set
- Full data snapshot is stored as JSON
- Supports version history and restore operations

## Authorization

- **Schedule publish:** Only the schedule operator can publish
- **Booking publish:** Only the booking guest can publish their own booking

## Database Schema Support

The implementation utilizes existing schema fields:
- schedules: version, status, publishedAt, publishedBy
- bookings: version, status, publishedAt, publishedBy
- resourceVersions: stores immutable snapshots

## Acceptance Criteria Met

✅ Both services use SnapshotService consistently
✅ Version increments work for both entity types (handled by SnapshotService)
✅ Published items immutable (prevented via updates and cancellation checks)
✅ All validations in place (entity-specific validation before publish)
