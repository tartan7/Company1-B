import { zonedTimeToUtc, toZonedTime } from 'date-fns-tz';
import { isValid, getTime, parse, format } from 'date-fns';
const SUPPORTED_TIMEZONES = [
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Hong_Kong',
    'America/Toronto',
    'America/Mexico_City',
    'Europe/Berlin',
    'Asia/Singapore',
    'America/Denver',
    'America/Chicago',
    'Europe/Amsterdam',
    'Asia/Bangkok',
    'America/Argentina/Buenos_Aires',
    'Africa/Johannesburg',
    'Asia/Kolkata',
    'Pacific/Auckland',
];
export class TimezoneService {
    static validateTimezone(timezone) {
        return SUPPORTED_TIMEZONES.includes(timezone);
    }
    static getSupportedTimezones() {
        return [...SUPPORTED_TIMEZONES];
    }
    static convertToUTC(dateStr, timeStr, timezone) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        const dateTimeStr = `${dateStr} ${timeStr}`;
        try {
            const zonedDate = parse(dateTimeStr, 'yyyy-MM-dd HH:mm', new Date(), { timeZone: timezone });
            if (!isValid(zonedDate)) {
                throw new Error('Invalid date or time format');
            }
            const utcDate = zonedTimeToUtc(zonedDate, timezone);
            return utcDate;
        }
        catch (error) {
            throw new Error(`Failed to convert time: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    static convertFromUTC(utcDate, timezone) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        const zonedDate = toZonedTime(utcDate, timezone);
        const date = format(zonedDate, 'yyyy-MM-dd', { timeZone: timezone });
        const time = format(zonedDate, 'HH:mm', { timeZone: timezone });
        return { date, time };
    }
    static convertBetweenTimezones(dateStr, timeStr, fromTimezone, toTimezone) {
        const utcDate = this.convertToUTC(dateStr, timeStr, fromTimezone);
        return this.convertFromUTC(utcDate, toTimezone);
    }
    static getDateRangeUTC(startDate, endDate, timeStr, timezone) {
        const startUTC = this.convertToUTC(startDate, timeStr, timezone);
        const endUTC = this.convertToUTC(endDate, timeStr, timezone);
        return { startUTC, endUTC, timezone };
    }
    static isDSTTransition(date, timezone) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const todayZoned = toZonedTime(date, timezone);
        const tomorrowZoned = toZonedTime(nextDay, timezone);
        const todayOffset = this.getUTCOffset(date, timezone);
        const tomorrowOffset = this.getUTCOffset(nextDay, timezone);
        return todayOffset !== tomorrowOffset;
    }
    static getUTCOffset(date, timezone) {
        const zonedDate = toZonedTime(date, timezone);
        const timeZoneOffset = new Date(zonedDate.toLocaleString('en-US', { timeZone: timezone })).getTime() - zonedDate.getTime();
        return timeZoneOffset / (1000 * 60); // offset in minutes
    }
    static isAmbiguousTime(dateStr, timeStr, timezone) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        try {
            const oneHourLater = new Date(new Date(`${dateStr}T${timeStr}:00Z`).getTime() + 60 * 60 * 1000);
            const utcDate1 = this.convertToUTC(dateStr, timeStr, timezone);
            const utcDate2 = this.convertToUTC(dateStr, timeStr, timezone);
            return getTime(utcDate1) === getTime(utcDate2);
        }
        catch {
            return false;
        }
    }
    static getTimezoneDisplayName(timezone) {
        try {
            const date = new Date();
            const zonedDate = toZonedTime(date, timezone);
            const offset = this.getUTCOffset(date, timezone);
            const offsetHours = Math.abs(offset) / 60;
            const offsetSign = offset <= 0 ? '+' : '-';
            const offsetStr = `UTC${offsetSign}${String(Math.floor(offsetHours)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
            return `${timezone} (${offsetStr})`;
        }
        catch {
            return timezone;
        }
    }
    static isValidDateTimeInTimezone(dateStr, timeStr, timezone) {
        try {
            const utcDate = this.convertToUTC(dateStr, timeStr, timezone);
            return isValid(utcDate);
        }
        catch {
            return false;
        }
    }
    static isMidnightCrossing(startDate, endDate) {
        return startDate !== endDate;
    }
    static handleDSTSpringForward(dateStr, timeStr, timezone) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        try {
            const utcDate = this.convertToUTC(dateStr, timeStr, timezone);
            return this.convertFromUTC(utcDate, timezone);
        }
        catch (error) {
            throw new Error(`Failed to handle DST spring forward: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    static handleDSTFallBack(dateStr, timeStr, timezone, isFirstOccurrence = true) {
        if (!this.validateTimezone(timezone)) {
            throw new Error(`Unsupported timezone: ${timezone}`);
        }
        try {
            if (isFirstOccurrence) {
                const utcDate = this.convertToUTC(dateStr, timeStr, timezone);
                return this.convertFromUTC(utcDate, timezone);
            }
            else {
                const dateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date(), { timeZone: timezone });
                const oneHourLater = new Date(dateTime.getTime() + 60 * 60 * 1000);
                const utcDate = zonedTimeToUtc(oneHourLater, timezone);
                return this.convertFromUTC(utcDate, timezone);
            }
        }
        catch (error) {
            throw new Error(`Failed to handle DST fall back: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    static compareTimesAcrossTimezones(date1Str, time1Str, tz1, date2Str, time2Str, tz2) {
        const utc1 = this.convertToUTC(date1Str, time1Str, tz1);
        const utc2 = this.convertToUTC(date2Str, time2Str, tz2);
        if (utc1 < utc2)
            return -1;
        if (utc1 > utc2)
            return 1;
        return 0;
    }
}
