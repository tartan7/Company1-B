import { toDate } from 'date-fns-tz';
const VALID_TIMEZONES = [
    'Africa/Johannesburg',
    'Africa/Cairo',
    'Africa/Lagos',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Toronto',
    'America/Mexico_City',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Europe/Istanbul',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'UTC',
];
export function isValidTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }
    return VALID_TIMEZONES.includes(timezone);
}
export function validateTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
        return { valid: false, error: 'Timezone must be a non-empty string' };
    }
    if (!isValidTimezone(timezone)) {
        return { valid: false, error: `Unsupported timezone: ${timezone}` };
    }
    try {
        const testDate = new Date('2024-01-15T12:00:00Z');
        toDate(testDate, { timeZone: timezone });
        return { valid: true };
    }
    catch {
        return { valid: false, error: `Invalid timezone format: ${timezone}` };
    }
}
export function getValidTimezones() {
    return [...VALID_TIMEZONES];
}
