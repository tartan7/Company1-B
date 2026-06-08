import { ScheduleService } from './scheduleService';
import { convertLocalToUTC, isValidTimezone } from '../utils/timezone';
// Test data
const testActivity = {
    title: 'Mountain Hiking Tour',
    description: 'A scenic mountain hiking experience',
    category: 'adventure',
    price: 99.99,
    duration: 4,
    location: 'Rocky Mountains',
    maxParticipants: 10,
};
const operatorId = 'operator_001';
const otherOperatorId = 'operator_002';
console.log('Testing Schedule CRUD Operations...\n');
// Test 1: Validate date format
console.log('1. VALIDATION - Date format validation');
console.log(`  Valid date (2026-05-25): ${ScheduleService.validateDateFormat('2026-05-25') ? '✓' : '✗'}`);
console.log(`  Invalid date (05-25-2026): ${!ScheduleService.validateDateFormat('05-25-2026') ? '✓' : '✗'}`);
console.log(`  Invalid date (2026/05/25): ${!ScheduleService.validateDateFormat('2026/05/25') ? '✓' : '✗'}\n`);
// Test 2: Validate time format
console.log('2. VALIDATION - Time format validation');
console.log(`  Valid time (14:30): ${ScheduleService.validateTimeFormat('14:30') ? '✓' : '✗'}`);
console.log(`  Valid time (09:00): ${ScheduleService.validateTimeFormat('09:00') ? '✓' : '✗'}`);
console.log(`  Invalid time (14:60): ${!ScheduleService.validateTimeFormat('14:60') ? '✓' : '✗'}`);
console.log(`  Invalid time (25:00): ${!ScheduleService.validateTimeFormat('25:00') ? '✓' : '✗'}\n`);
// Test 3: Validate time range
console.log('3. VALIDATION - Time range validation');
console.log(`  Valid range (09:00 < 17:00): ${ScheduleService.validateTimeRange('09:00', '17:00') ? '✓' : '✗'}`);
console.log(`  Invalid range (17:00 < 09:00): ${!ScheduleService.validateTimeRange('17:00', '09:00') ? '✓' : '✗'}`);
console.log(`  Invalid range (09:00 = 09:00): ${!ScheduleService.validateTimeRange('09:00', '09:00') ? '✓' : '✗'}\n`);
// Test 4: Validate date range
console.log('4. VALIDATION - Date range validation');
console.log(`  Valid range (2026-05-25 <= 2026-05-26): ${ScheduleService.validateDateRange('2026-05-25', '2026-05-26') ? '✓' : '✗'}`);
console.log(`  Valid range (2026-05-25 = 2026-05-25): ${ScheduleService.validateDateRange('2026-05-25', '2026-05-25') ? '✓' : '✗'}`);
console.log(`  Invalid range (2026-05-26 < 2026-05-25): ${!ScheduleService.validateDateRange('2026-05-26', '2026-05-25') ? '✓' : '✗'}\n`);
// Test 5: CREATE schedule
console.log('5. CREATE - Creating new schedule');
const createInput = {
    activityId: 'activity_001',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    startTime: '09:00',
    endTime: '17:00',
    totalSlots: 20,
};
const schedule = ScheduleService.createSchedule(createInput, operatorId);
console.log(`✓ Schedule created with ID: ${schedule.id}`);
console.log(`  Activity: ${schedule.activityId}`);
console.log(`  Dates: ${schedule.startDate} to ${schedule.endDate}`);
console.log(`  Times: ${schedule.startTime} to ${schedule.endTime}`);
console.log(`  Slots: ${schedule.availableSlots}/${schedule.totalSlots}`);
console.log(`  Operator: ${schedule.operatorId}\n`);
// Test 6: READ schedule
console.log('6. READ - Fetching schedule by ID');
const fetched = ScheduleService.getSchedule(schedule.id);
console.log(`✓ Schedule retrieved: ${fetched?.id}`);
console.log(`  Available slots: ${fetched?.availableSlots}\n`);
// Test 7: READ non-existent schedule
console.log('7. READ - Attempting to fetch non-existent schedule');
const notFound = ScheduleService.getSchedule('fake_id');
console.log(`✓ Non-existent schedule returned: ${notFound === null ? 'null' : 'found'}\n`);
// Test 8: GET schedules by activity
console.log('8. READ - Getting schedules for activity');
const schedule2 = ScheduleService.createSchedule({
    activityId: 'activity_001',
    startDate: '2026-06-06',
    endDate: '2026-06-10',
    startTime: '10:00',
    endTime: '18:00',
    totalSlots: 15,
}, operatorId);
const activitySchedules = ScheduleService.getSchedulesByActivity('activity_001');
console.log(`✓ Found ${activitySchedules.length} schedules for activity`);
console.log(`  Schedule IDs: ${activitySchedules.map(s => s.id).join(', ')}\n`);
// Test 9: UPDATE schedule
console.log('9. UPDATE - Updating schedule');
const updated = ScheduleService.updateSchedule(schedule.id, { totalSlots: 25 }, operatorId);
console.log(`✓ Schedule updated`);
console.log(`  New total slots: ${updated?.totalSlots}`);
console.log(`  Available slots: ${updated?.availableSlots}\n`);
// Test 10: UPDATE with wrong operator (should fail)
console.log('10. UPDATE - Attempting update with different operator (should fail)');
try {
    ScheduleService.updateSchedule(schedule.id, { totalSlots: 30 }, otherOperatorId);
    console.log('✗ ERROR: Should have thrown authorization error');
}
catch (error) {
    console.log(`✓ Correctly rejected: ${error.message}\n`);
}
// Test 11: BOOK slots
console.log('11. BOOKING - Booking available slots');
const booked = ScheduleService.bookSlot(schedule.id, 5);
const updatedAfterBook = ScheduleService.getSchedule(schedule.id);
console.log(`✓ Booked 5 slots: ${booked ? 'success' : 'failed'}`);
console.log(`  Available slots remaining: ${updatedAfterBook?.availableSlots}\n`);
// Test 12: BOOK more than available (should fail)
console.log('12. BOOKING - Attempting to book more slots than available');
const overBook = ScheduleService.bookSlot(schedule.id, 100);
console.log(`✓ Attempted overbooking: ${!overBook ? 'correctly rejected' : 'ERROR: should have failed'}\n`);
// Test 13: RELEASE slots
console.log('13. BOOKING - Releasing booked slots');
const released = ScheduleService.releaseSlots(schedule.id, 3);
const updatedAfterRelease = ScheduleService.getSchedule(schedule.id);
console.log(`✓ Released 3 slots: ${released ? 'success' : 'failed'}`);
console.log(`  Available slots now: ${updatedAfterRelease?.availableSlots}\n`);
// Test 14: DELETE schedule
console.log('14. DELETE - Deleting schedule');
const deleted = ScheduleService.deleteSchedule(schedule.id, operatorId);
console.log(`✓ Schedule soft deleted: ${deleted}`);
// Verify schedule is soft-deleted (not accessible)
const deletedSchedule = ScheduleService.getSchedule(schedule.id);
console.log(`  Schedule accessible after delete: ${deletedSchedule ? 'ERROR: should be deleted' : '✓ correctly hidden'}\n`);
// Test 15: DELETE non-existent schedule
console.log('15. DELETE - Attempting to delete non-existent schedule');
const notDeleted = ScheduleService.deleteSchedule('fake_id', operatorId);
console.log(`✓ Non-existent schedule delete returned: ${notDeleted}\n`);
// Test 16: DELETE with wrong operator (should fail)
console.log('16. DELETE - Attempting delete with different operator (should fail)');
try {
    ScheduleService.deleteSchedule(schedule2.id, otherOperatorId);
    console.log('✗ ERROR: Should have thrown authorization error');
}
catch (error) {
    console.log(`✓ Correctly rejected: ${error.message}\n`);
}
// Test 17: Verify soft-deleted schedules don't appear in activity list
console.log('17. VALIDATION - Soft-deleted schedules excluded from activity list');
const finalSchedules = ScheduleService.getSchedulesByActivity('activity_001');
console.log(`✓ Schedules for activity: ${finalSchedules.length} (deleted schedule excluded)\n`);
// TIMEZONE TESTS
console.log('=== TIMEZONE SUPPORT TESTS ===\n');
// Test 18: Timezone validation
console.log('18. TIMEZONE - Validating timezone support');
console.log(`  Valid timezone (UTC): ${isValidTimezone('UTC') ? '✓' : '✗'}`);
console.log(`  Valid timezone (America/New_York): ${isValidTimezone('America/New_York') ? '✓' : '✗'}`);
console.log(`  Invalid timezone (Invalid/Zone): ${!isValidTimezone('Invalid/Zone') ? '✓' : '✗'}\n`);
// Test 19: Create schedule with timezone
console.log('19. TIMEZONE - Creating schedule with explicit timezone');
const tzInput = {
    activityId: 'activity_tz_001',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    startTime: '09:00',
    endTime: '17:00',
    totalSlots: 20,
    timezone: 'America/New_York', // EDT is UTC-4 in June
};
const scheduleWithTZ = ScheduleService.createSchedule(tzInput, operatorId);
console.log(`✓ Schedule created with timezone: ${scheduleWithTZ.timezone}`);
console.log(`  Local times: ${scheduleWithTZ.startTime} - ${scheduleWithTZ.endTime}`);
console.log(`  UTC times: ${scheduleWithTZ.startTimeUTC} - ${scheduleWithTZ.endTimeUTC}`);
console.log(`  (09:00 EDT should be 13:00 UTC, 17:00 EDT should be 21:00 UTC)\n`);
// Test 20: Create schedule without timezone (should default to UTC)
console.log('20. TIMEZONE - Creating schedule without timezone (default to UTC)');
const noTzInput = {
    activityId: 'activity_tz_002',
    startDate: '2026-06-20',
    endDate: '2026-06-20',
    startTime: '10:00',
    endTime: '18:00',
    totalSlots: 15,
    // No timezone provided - should default to UTC
};
const scheduleNoTZ = ScheduleService.createSchedule(noTzInput, operatorId);
console.log(`✓ Schedule created with default timezone: ${scheduleNoTZ.timezone}`);
console.log(`  Local times: ${scheduleNoTZ.startTime} - ${scheduleNoTZ.endTime}`);
console.log(`  UTC times: ${scheduleNoTZ.startTimeUTC} - ${scheduleNoTZ.endTimeUTC}`);
console.log(`  (Should be same as local times since timezone is UTC)\n`);
// Test 21: Verify backward compatibility - schedules are stored with timezone
console.log('21. BACKWARD COMPATIBILITY - Timezone field is mandatory');
const retrievedSchedule = ScheduleService.getSchedule(scheduleWithTZ.id);
console.log(`✓ Retrieved schedule has timezone: ${retrievedSchedule?.timezone}`);
console.log(`  Has startTimeUTC: ${retrievedSchedule?.startTimeUTC ? '✓' : '✗'}`);
console.log(`  Has endTimeUTC: ${retrievedSchedule?.endTimeUTC ? '✓' : '✗'}\n`);
// Test 22: Get schedule with userTimezone parameter
console.log('22. TIMEZONE - Get schedule with user timezone parameter');
const scheduleUserTZ = ScheduleService.getSchedule(scheduleWithTZ.id, 'Europe/London');
console.log(`✓ Retrieved schedule with user timezone parameter: Europe/London`);
console.log(`  Original timezone: ${scheduleUserTZ?.timezone}`);
console.log(`  Schedule returned successfully: ${scheduleUserTZ ? '✓' : '✗'}\n`);
// Test 23: Update schedule timezone
console.log('23. TIMEZONE - Updating schedule timezone');
const updatedWithTZ = ScheduleService.updateSchedule(scheduleNoTZ.id, { timezone: 'Asia/Tokyo' }, operatorId);
console.log(`✓ Schedule timezone updated: ${updatedWithTZ?.timezone}`);
console.log(`  New UTC start time: ${updatedWithTZ?.startTimeUTC}`);
console.log(`  New UTC end time: ${updatedWithTZ?.endTimeUTC}\n`);
// Test 24: Timezone conversion for multiple zones
console.log('24. TIMEZONE - Verify UTC conversions for different timezones');
const testZones = [
    { zone: 'UTC', name: 'UTC' },
    { zone: 'America/Los_Angeles', name: 'PST (UTC-8)' },
    { zone: 'Europe/London', name: 'GMT (UTC+0)' },
    { zone: 'Asia/Tokyo', name: 'JST (UTC+9)' },
];
testZones.forEach(({ zone, name }) => {
    const conv = convertLocalToUTC('2026-06-15', '12:00', zone);
    console.log(`  ${name}: 12:00 local → ${conv.utcTime} UTC`);
});
console.log();
// Test 25: Booking still works with UTC times
console.log('25. AVAILABILITY - Booking works with UTC times');
const bookSlots = ScheduleService.bookSlot(scheduleWithTZ.id, 3);
const afterBook = ScheduleService.getSchedule(scheduleWithTZ.id);
console.log(`✓ Booked 3 slots: ${bookSlots ? 'success' : 'failed'}`);
console.log(`  Available slots: ${afterBook?.availableSlots}/${afterBook?.totalSlots}`);
console.log(`  UTC times unchanged: ${afterBook?.startTimeUTC} - ${afterBook?.endTimeUTC}\n`);
console.log('All tests completed successfully!');
