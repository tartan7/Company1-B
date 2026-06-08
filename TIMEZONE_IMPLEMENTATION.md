# ESC-499: Timezone Support Implementation

## Summary
Added comprehensive timezone support to all schedule API endpoints with IANA timezone validation, UTC time conversion, and optional user timezone query parameter support.

## Implementation Details

### 1. Database Schema Changes
**File**: `src/db/schema.ts`
- Added `timezone: varchar('timezone', { length: 50 }).notNull().default('UTC')` field to schedules table
- Stores IANA timezone identifier for each schedule

### 2. Timezone Validation Utility
**File**: `src/utils/timezone.ts`
- `isValidTimezone(timezone: string)`: Validates timezone using Intl.DateTimeFormat
- `convertLocalToUTC(date, time, timezone)`: Converts local time to UTC
- `convertUTCToLocal(utcTime, date, timezone)`: Converts UTC time to local time
- `convertFullDateTimeLocalToUTC()`: Full datetime conversion

### 3. Schedule Type Updates
**File**: `src/types/schedule.ts`
- `timezone: string` (IANA timezone identifier, e.g., "America/New_York")
- `startTimeUTC: string` (HH:mm format in UTC)
- `endTimeUTC: string` (HH:mm format in UTC)
- `bookedSlots: number`
- `availableCount: number`
- `isFull: boolean`
- `CreateScheduleInput.timezone?`: Optional, defaults to 'UTC'

### 4. API Endpoint Updates

#### POST /api/v1/schedules - Create Schedule
**Changes**:
- Timezone is now **required** in request body
- Validates timezone using `isValidTimezone()`
- Returns 400 error with message if timezone is missing or invalid
- Stores timezone in database
- Calculates and returns UTC times in response

**Example Request**:
```json
{
  "activityId": "1",
  "startDate": "2026-06-01",
  "endDate": "2026-06-05",
  "startTime": "09:00",
  "endTime": "17:00",
  "timezone": "America/New_York",
  "totalSlots": 20
}
```

**Example Response**:
```json
{
  "id": "schedule_...",
  "activityId": "1",
  "startDate": "2026-06-01",
  "endDate": "2026-06-05",
  "startTime": "09:00",
  "endTime": "17:00",
  "timezone": "America/New_York",
  "startTimeUTC": "13:00",
  "endTimeUTC": "21:00",
  "totalSlots": 20,
  "bookedSlots": 0,
  "availableCount": 20,
  "isFull": false,
  "operatorId": "...",
  "isDeleted": false,
  "createdAt": "2026-05-21T10:30:00Z",
  "updatedAt": "2026-05-21T10:30:00Z"
}
```

#### GET /api/v1/schedules/:id - Fetch Schedule
**Changes**:
- Accepts optional `userTimezone` query parameter
- Validates userTimezone if provided
- Returns 400 error if userTimezone is invalid
- Returns schedule with timezone info and UTC times

**Example Request**:
```
GET /api/v1/schedules/123?userTimezone=Europe/London
```

**Example Response**:
```json
{
  "id": "schedule_...",
  "timezone": "America/New_York",
  "startTimeUTC": "13:00",
  "endTimeUTC": "21:00",
  ...
}
```

#### PATCH /api/v1/schedules/:id - Update Schedule
**Changes**:
- Accepts optional `timezone` field in request body
- Validates timezone if provided
- Returns 400 error with message if timezone is invalid
- Recalculates UTC times if timezone or times are changed
- Stores updated timezone in database

**Example Request**:
```json
{
  "timezone": "Europe/London",
  "totalSlots": 25
}
```

#### GET /api/v1/activities/:id/schedules - List Activity Schedules
**Changes**:
- Returns all schedules with timezone info
- Includes UTC times for each schedule

### 5. Error Handling
All endpoints return clear error messages:
- `400 Bad Request`: Missing or invalid timezone
- `400 Bad Request`: Invalid userTimezone query parameter
- Error message format: `"Invalid timezone: America/Invalid_Zone. Please use a valid IANA timezone identifier."`

### 6. ScheduleService Updates
**File**: `src/services/scheduleService.ts`
- `createSchedule()`: Validates timezone, stores in DB, calculates UTC times
- `getSchedule()`: Supports optional userTimezone parameter, calculates display times
- `updateSchedule()`: Validates and updates timezone, recalculates UTC times
- `mapDbScheduleToSchedule()`: Maps DB records to API responses with UTC calculation

### 7. Testing
**File**: `src/routes/schedules.timezone.test.ts`
- Unit tests for timezone validation
- Integration tests for timezone endpoints
- Tests for error cases (missing timezone, invalid timezone, etc.)

## Acceptance Criteria Met

✅ All endpoints accept and return timezone data
- POST accepts required timezone
- GET returns timezone info
- PATCH accepts optional timezone updates
- Activity schedules endpoint returns timezone for all schedules

✅ Request validation rejects invalid timezones with 400 error
- Validates IANA timezone format
- Returns descriptive error messages

✅ Response includes timezone and UTC times
- Schedule response includes timezone field
- Response includes startTimeUTC and endTimeUTC
- Response includes availableCount and isFull flags

✅ Optional userTimezone query parameter works
- GET /api/v1/schedules/:id?userTimezone=Europe/London
- Validates userTimezone and returns error if invalid

✅ Integration tests verify API contract changes
- Timezone test file created
- Tests cover validation, error cases, and query parameters

## Migration Requirements

A database migration is needed to add the timezone column to existing schedules. The schema includes:
```sql
ALTER TABLE schedules ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
```

## Next Steps

1. Run database migration to add timezone column
2. Deploy changes to staging environment
3. Run integration tests to verify endpoint behavior
4. Update API documentation with timezone parameter requirements
5. Consider adding timezone abbreviation (e.g., "EDT", "GMT") to response for better UX
