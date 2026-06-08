export function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    }
    catch {
        return false;
    }
}
export function convertLocalToUTC(date, // YYYY-MM-DD format
time, // HH:mm format in local timezone
timezone) {
    if (!isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
    }
    const [hours, minutes] = time.split(':').map(Number);
    const localDateTime = new Date(`${date}T${time}:00`);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(localDateTime);
    const partsMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const offset = localDateTime.getTime() -
        new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}Z`).getTime();
    const utcDateTime = new Date(localDateTime.getTime() - offset);
    const utcTime = `${String(utcDateTime.getUTCHours()).padStart(2, '0')}:${String(utcDateTime.getUTCMinutes()).padStart(2, '0')}`;
    return {
        utcTime,
        localTime: time,
        timezone,
    };
}
export function convertUTCToLocal(utcTime, // HH:mm format in UTC
date, // YYYY-MM-DD format (can be UTC or local - context dependent)
timezone) {
    if (!isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
    }
    const [hours, minutes] = utcTime.split(':').map(Number);
    const utcDateTime = new Date(`${date}T${utcTime}:00Z`);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(utcDateTime);
    const partsMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const localTime = `${partsMap.hour}:${partsMap.minute}`;
    return {
        utcTime,
        localTime,
        timezone,
    };
}
export function convertFullDateTimeLocalToUTC(date, // YYYY-MM-DD format
time, // HH:mm format
timezone) {
    const conversion = convertLocalToUTC(date, time, timezone);
    const [hours, minutes] = conversion.utcTime.split(':').map(Number);
    const utcDate = new Date(`${date}T${time}:00`);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(utcDate);
    const partsMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const offset = utcDate.getTime() -
        new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}Z`).getTime();
    const utcDateTime = new Date(utcDate.getTime() - offset);
    const utcDateString = utcDateTime.toISOString().split('T')[0];
    return {
        utcDateTime: utcDateTime.toISOString(),
        localDate: date,
        localTime: time,
        timezone,
    };
}
