# Timezone Documentation

## Overview

This tourism booking API implements comprehensive timezone support to handle global scheduling across multiple timezones. All schedules are stored with both local times (in the schedule's timezone) and UTC equivalents for consistent database storage and cross-timezone comparisons.

## Key Concepts

### Local vs UTC Times
- **Local Times**: Times stored in the schedule's specified timezone (e.g., 14:00 in America/New_York)
- **UTC Times**: Times converted to UTC for database storage and cross-timezone comparisons
- **Dual Storage**: Schedule stores both representations for performance and flexibility

### Supported Timezones

The following IANA timezones are fully supported:

#### Americas
- America/New_York (Eastern)
- America/Los_Angeles (Pacific)
- America/Chicago (Central)
- America/Denver (Mountain)
- America/Toronto (Eastern Canada)
- America/Mexico_City

#### Europe
- Europe/London
- Europe/Paris
- Europe/Berlin
- Europe/Amsterdam

#### Asia-Pacific
- Asia/Tokyo
- Asia/Hong_Kong
- Asia/Singapore
- Asia/Dubai
- Asia/Thailand
- Asia/Kolkata
- Australia/Sydney
- Australia/Melbourne
- Pacific/Auckland

#### UTC
- UTC (default for backward compatibility)

## Schedule Type

```typescript
export type Schedule = {
  id: string;
  activityId: string;
  startDate: string;        // YYYY-MM-DD in local timezone
  endDate: string;          // YYYY-MM-DD in local timezone
  startTime: string;        // HH:mm in local timezone
  endTime: string;          // HH:mm in local timezone
  timezone: string;         // IANA timezone identifier
  startTimeUTC: string;     // HH:mm in UTC
  endTimeUTC: string;       // HH:mm in UTC
  availableSlots: number;
  totalSlots: number;
  operatorId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

## Creating a Schedule

### Basic Example
```typescript
import { ScheduleService } from './services/scheduleService';

const schedule = ScheduleService.createSchedule(
  {
    activityId: 'mountain_hike_001',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    startTime: '09:00',
    endTime: '17:00',
    totalSlots: 20,
    timezone: 'America/New_York'  // Required
  },
  'operator_123'
);
```

### With Default Timezone (UTC)
For backward compatibility, if timezone is omitted, it defaults to UTC:

```typescript
const schedule = ScheduleService.createSchedule(
  {
    activityId: 'activity_001',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    startTime: '09:00',
    endTime: '17:00',
    totalSlots: 20,
    // timezone defaults to 'UTC' if omitted
  },
  'operator_123'
);
```

## Timezone Conversion Utilities

### isValidTimezone(timezone: string): boolean
Validates if a timezone string is supported.

```typescript
import { isValidTimezone } from './utils/timezone';

if (isValidTimezone('America/New_York')) {
  // Valid timezone
}
```

### convertLocalToUTC(date: string, time: string, timezone: string)
Converts a local time in a specific timezone to UTC.

```typescript
import { convertLocalToUTC } from './utils/timezone';

const result = convertLocalToUTC('2026-06-15', '14:00', 'America/New_York');
// Returns: { utcTime: '18:00', localTime: '14:00', timezone: 'America/New_York' }
```

### convertUTCToLocal(utcTime: string, date: string, timezone: string)
Converts UTC time to local time in a specific timezone.

```typescript
import { convertUTCToLocal } from './utils/timezone';

const result = convertUTCToLocal('18:00', '2026-06-15', 'America/New_York');
// Returns: { utcTime: '18:00', localTime: '14:00', timezone: 'America/New_York' }
```

### convertFullDateTimeLocalToUTC(date: string, time: string, timezone: string)
Converts a full date and time to UTC ISO 8601 format.

```typescript
import { convertFullDateTimeLocalToUTC } from './utils/timezone';

const result = convertFullDateTimeLocalToUTC('2026-06-15', '14:00', 'America/New_York');
// Returns UTC datetime in ISO 8601 format
```

## Handling Timezone Edge Cases

### Daylight Saving Time (DST)

#### Spring Forward (2:00 AM → 3:00 AM)
When clocks spring forward, times between 2:00 AM and 3:00 AM don't exist. The system automatically handles this by computing the next valid time.

```typescript
// During DST spring forward (March 8, 2026 in America/New_York)
const result = convertLocalToUTC('2026-03-08', '02:30', 'America/New_York');
// 2:30 AM doesn't exist - system handles gracefully
```

**Best Practice**: Avoid scheduling events at 2:00-3:00 AM during spring DST transitions.

#### Fall Back (2:00 AM appears twice)
When clocks fall back, times between 2:00 AM and 3:00 AM occur twice. The system treats ambiguous times as the first occurrence (EDT before EST).

```typescript
// During DST fall back (November 1, 2026 in America/New_York)
const result = convertLocalToUTC('2026-11-01', '02:30', 'America/New_York');
// First occurrence (EDT) is used
```

**Best Practice**: For critical bookings during fall DST transitions, specify times outside the 2:00-3:00 AM window.

### Midnight Crossing

When a schedule spans multiple days, the system correctly handles date boundaries across timezones:

```typescript
// Schedule in Tokyo (UTC+9) that runs late into the evening
const schedule = ScheduleService.createSchedule(
  {
    activityId: 'night_tour',
    startDate: '2026-06-15',
    endDate: '2026-06-16',     // Spans two calendar days
    startTime: '22:00',
    endTime: '04:00',          // Ends next morning
    totalSlots: 10,
    timezone: 'Asia/Tokyo'
  },
  'operator_123'
);
```

The system stores:
- Local dates: 2026-06-15 → 2026-06-16 (in Tokyo timezone)
- Corresponding UTC times computed correctly with date adjustments

### Year Boundary Crossing

Schedules that cross calendar year boundaries are handled correctly:

```typescript
// New Year's Eve booking in Los Angeles
const schedule = ScheduleService.createSchedule(
  {
    activityId: 'nye_party',
    startDate: '2025-12-31',
    endDate: '2025-12-31',
    startTime: '22:00',
    endTime: '23:59',
    totalSlots: 50,
    timezone: 'America/Los_Angeles'
  },
  'operator_nye'
);
// Correctly converts to UTC (which would be next day, 2026-01-01)
```

## Cross-Timezone Comparisons

When comparing schedules across timezones, always use UTC times:

```typescript
// Get both schedules
const nySchedule = ScheduleService.getSchedule('schedule_ny_001');
const tokyoSchedule = ScheduleService.getSchedule('schedule_tokyo_001');

// Compare using UTC times
if (nySchedule.startTimeUTC < tokyoSchedule.startTimeUTC) {
  // NY event starts before Tokyo event (in absolute time)
}
```

## Performance Requirements

All timezone conversion operations maintain < 5ms latency:

- Single timezone validation: < 0.5ms
- Local to UTC conversion: < 2ms
- UTC to local conversion: < 2ms
- Round-trip conversion: < 4ms
- Batch operations (4+ conversions): < 5ms average

See `timezonePerformance.test.ts` for detailed performance metrics.

## Backward Compatibility

### Existing Schedules
Schedules created before timezone support will default to UTC timezone. This ensures:
- No breaking changes to existing data
- All existing schedules remain functional
- Transparent migration path (update timezone if needed)

### UTC as Default
If timezone is not specified when creating a schedule, UTC is used automatically.

## Validation Rules

When creating a schedule, the following validations are performed:

1. **Timezone Validation**: Must be a valid IANA timezone
2. **Date Format**: Must be YYYY-MM-DD format
3. **Time Format**: Must be HH:mm format (24-hour)
4. **Time Range**: startTime must be before endTime (local timezone)
5. **Date Range**: startDate must be ≤ endDate (local timezone)
6. **No Past Dates**: Schedules cannot be created for past dates

```typescript
// Will throw error - invalid timezone
try {
  ScheduleService.createSchedule({
    activityId: 'test',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    startTime: '09:00',
    endTime: '17:00',
    totalSlots: 20,
    timezone: 'Invalid/Timezone'  // Error!
  }, 'operator_123');
} catch (error) {
  console.error('Invalid timezone:', error.message);
}
```

## API Integration Examples

### Create Schedule with Timezone
```typescript
POST /api/schedules
{
  "activityId": "mountain_hike_001",
  "startDate": "2026-06-15",
  "endDate": "2026-06-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "totalSlots": 20,
  "timezone": "America/New_York"
}
```

### Response
```json
{
  "id": "schedule_1716249600000_abc123def",
  "activityId": "mountain_hike_001",
  "startDate": "2026-06-15",
  "endDate": "2026-06-15",
  "startTime": "09:00",
  "endTime": "17:00",
  "timezone": "America/New_York",
  "startTimeUTC": "13:00",
  "endTimeUTC": "21:00",
  "availableSlots": 20,
  "totalSlots": 20,
  "operatorId": "operator_123",
  "isDeleted": false,
  "createdAt": "2026-05-21T10:30:00.000Z",
  "updatedAt": "2026-05-21T10:30:00.000Z"
}
```

## Testing

Comprehensive test suites are included:

### Unit Tests (`timezoneService.test.ts`)
- Timezone validation (valid/invalid)
- DST spring forward handling
- DST fall back handling
- Midnight crossing
- Ambiguous times
- Multi-timezone conversions
- Backward compatibility
- Round-trip conversions
- Extreme timezone differences
- New Year boundary
- Leap year handling

### Integration Tests (`scheduleTimezoneIntegration.test.ts`)
- Schedule creation with timezones
- Default timezone backward compatibility
- Multiple timezone schedules
- Cross-timezone booking
- Schedule updates
- Schedule retrieval with timezone
- Activity schedule filtering
- Cross-timezone comparison
- Slot release across timezones
- Schedule deletion
- Invalid timezone rejection
- UTC boundary crossing

### Performance Tests (`timezonePerformance.test.ts`)
- Timezone validation performance (< 1ms)
- Local to UTC conversion (< 2ms)
- UTC to local conversion (< 2ms)
- Full datetime conversion (< 2ms)
- Round-trip conversion (< 4ms)
- Multi-timezone batch operations
- Different date formats
- DST boundary performance
- Large batch processing (100+ conversions)
- Random timezone worst-case performance

## Running Tests

```bash
# Unit tests for timezone utilities
npm test src/utils/timezoneService.test.ts

# Integration tests for schedule + timezone
npm test src/services/scheduleTimezoneIntegration.test.ts

# Performance tests
npm test src/utils/timezonePerformance.test.ts

# All tests
npm test
```

## Troubleshooting

### Issue: "Invalid timezone" error
**Solution**: Use valid IANA timezone identifiers. Check the supported list above. Full list available at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Issue: Schedule times seem off by an hour
**Solution**: Check if creating during DST transition (2:00-3:00 AM spring forward, 2:00-3:00 AM fall back). Either avoid these times or expect automatic adjustment.

### Issue: Comparison between two schedules gives unexpected results
**Solution**: Always use UTC times for comparison, not local times. Example:
```typescript
// ✗ Wrong - comparing local times across timezones
if (nySchedule.startTime > tokyoSchedule.startTime) { }

// ✓ Correct - comparing UTC times
if (nySchedule.startTimeUTC > tokyoSchedule.startTimeUTC) { }
```

## Future Enhancements

Potential future improvements:
1. User-specific timezone preference for display (while storing in schedule timezone)
2. Automatic timezone detection from user location
3. DST transition warnings in booking confirmation
4. Timezone offset caching for improved performance
5. Support for deprecated/historical timezones
6. Custom timezone definitions for special cases

## References

- [IANA Timezone Database](https://www.iana.org/time-zones)
- [date-fns-tz Documentation](https://date-fns.org/docs/Timezone)
- [ISO 8601 Standard](https://en.wikipedia.org/wiki/ISO_8601)
- [Daylight Saving Time Guide](https://en.wikipedia.org/wiki/Daylight_saving_time)
