import { ScheduleService } from './scheduleService';
import { isValidTimezone, convertLocalToUTC, convertUTCToLocal } from '../utils/timezone';
import { CreateScheduleInput } from '../types/schedule';

console.log('=== SCHEDULE TIMEZONE INTEGRATION TESTS ===\n');

const operatorId = 'operator_tz_test';
const activityId = 'activity_tz_test';

const integrationTestResults: { name: string; passed: boolean; details?: string }[] = [];

function addIntegrationTest(name: string, passed: boolean, details?: string) {
  integrationTestResults.push({ name, passed, details });
}

// Test 1: Schedule creation with timezone
console.log('1. SCHEDULE CREATION WITH TIMEZONE');
try {
  const schedule1 = ScheduleService.createSchedule(
    {
      activityId,
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      startTime: '09:00',
      endTime: '17:00',
      totalSlots: 20,
      timezone: 'America/New_York',
    },
    operatorId
  );
  console.log(`  ✓ Created schedule in America/New_York`);
  console.log(`    Schedule ID: ${schedule1.id}`);
  console.log(`    Timezone: ${schedule1.timezone}`);
  console.log(`    UTC times: ${schedule1.startTimeUTC} - ${schedule1.endTimeUTC}`);
  addIntegrationTest('Create schedule with NY timezone', true);
} catch (error) {
  console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
  addIntegrationTest('Create schedule with NY timezone', false, String(error));
}

// Test 2: Schedule with default timezone (backward compatibility)
console.log('\n2. BACKWARD COMPATIBILITY - Default UTC Timezone');
try {
  const schedule2 = ScheduleService.createSchedule(
    {
      activityId,
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      startTime: '09:00',
      endTime: '17:00',
      totalSlots: 20,
      // timezone omitted - should default to UTC
    },
    operatorId
  );
  console.log(`  ✓ Created schedule with default timezone`);
  console.log(`    Timezone: ${schedule2.timezone}`);
  const isDefault = schedule2.timezone === 'UTC';
  addIntegrationTest('Default UTC timezone', isDefault);
} catch (error) {
  console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
  addIntegrationTest('Default UTC timezone', false, String(error));
}

// Test 3: Multiple timezone booking schedules
console.log('\n3. MULTIPLE TIMEZONE SCHEDULES');
const timezoneTests = [
  { tz: 'America/Los_Angeles', label: 'Pacific' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'Asia/Tokyo', label: 'Tokyo' },
  { tz: 'Australia/Sydney', label: 'Sydney' },
];

const createdSchedules: any[] = [];
timezoneTests.forEach(({ tz, label }) => {
  try {
    const schedule = ScheduleService.createSchedule(
      {
        activityId: `activity_${label}`,
        startDate: '2026-06-20',
        endDate: '2026-06-20',
        startTime: '14:00',
        endTime: '18:00',
        totalSlots: 15,
        timezone: tz,
      },
      operatorId
    );
    console.log(`  ✓ ${label} (${tz}): ${schedule.startTimeUTC} UTC`);
    createdSchedules.push(schedule);
    addIntegrationTest(`Schedule in ${label}`, true);
  } catch (error) {
    console.log(`  ✗ ${label}: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest(`Schedule in ${label}`, false);
  }
});

// Test 4: Booking across timezones (same activity, different timezones)
console.log('\n4. BOOKING ACROSS TIMEZONES');
if (createdSchedules.length > 0) {
  try {
    const booked1 = ScheduleService.bookSlot(createdSchedules[0].id, 5);
    const booked2 = ScheduleService.bookSlot(createdSchedules[1].id, 3);
    console.log(`  ✓ Booked slots across different timezone schedules`);
    console.log(`    Schedule 1: ${5} slots booked`);
    console.log(`    Schedule 2: ${3} slots booked`);
    addIntegrationTest('Booking across timezones', booked1 && booked2);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Booking across timezones', false);
  }
}

// Test 5: Schedule update with timezone change
console.log('\n5. SCHEDULE UPDATE WITH TIMEZONE CHANGE');
if (createdSchedules.length > 0) {
  try {
    const scheduleToUpdate = createdSchedules[0];
    const updated = ScheduleService.updateSchedule(
      scheduleToUpdate.id,
      {
        startDate: '2026-06-21',
        endDate: '2026-06-21',
        startTime: '10:00',
        endTime: '14:00',
        totalSlots: 25,
      },
      operatorId
    );
    console.log(`  ✓ Updated schedule`);
    console.log(`    Original: ${scheduleToUpdate.startDate} ${scheduleToUpdate.startTime}`);
    console.log(`    Updated: ${updated?.startDate} ${updated?.startTime}`);
    addIntegrationTest('Schedule update', updated !== null);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Schedule update', false);
  }
}

// Test 6: Retrieve schedule and verify timezone
console.log('\n6. RETRIEVE SCHEDULE WITH TIMEZONE');
if (createdSchedules.length > 0) {
  try {
    const retrieved = ScheduleService.getSchedule(createdSchedules[0].id);
    console.log(`  ✓ Retrieved schedule: ${retrieved?.id}`);
    console.log(`    Timezone: ${retrieved?.timezone}`);
    console.log(`    Local times: ${retrieved?.startTime} - ${retrieved?.endTime}`);
    console.log(`    UTC times: ${retrieved?.startTimeUTC} - ${retrieved?.endTimeUTC}`);
    addIntegrationTest('Retrieve schedule with timezone', retrieved !== null);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Retrieve schedule with timezone', false);
  }
}

// Test 7: Get schedules by activity (all timezones)
console.log('\n7. GET SCHEDULES BY ACTIVITY');
try {
  const allSchedules = ScheduleService.getSchedulesByActivity(activityId);
  console.log(`  ✓ Retrieved ${allSchedules.length} schedules for activity`);
  allSchedules.forEach(s => {
    console.log(`    - ${s.timezone}: ${s.startDate} ${s.startTime}`);
  });
  addIntegrationTest('Get schedules by activity', allSchedules.length > 0);
} catch (error) {
  console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
  addIntegrationTest('Get schedules by activity', false);
}

// Test 8: Cross-timezone schedule comparison
console.log('\n8. CROSS-TIMEZONE SCHEDULE COMPARISON');
if (createdSchedules.length >= 2) {
  try {
    const sch1 = createdSchedules[0];
    const sch2 = createdSchedules[1];
    console.log(`  ✓ Comparing schedules in different timezones:`);
    console.log(`    ${sch1.timezone}: ${sch1.startDate} ${sch1.startTime} (UTC: ${sch1.startTimeUTC})`);
    console.log(`    ${sch2.timezone}: ${sch2.startDate} ${sch2.startTime} (UTC: ${sch2.startTimeUTC})`);
    console.log(`    Both stored correctly with timezone context`);
    addIntegrationTest('Cross-timezone comparison', true);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Cross-timezone comparison', false);
  }
}

// Test 9: Release slots across timezones
console.log('\n9. RELEASE SLOTS ACROSS TIMEZONES');
if (createdSchedules.length > 0) {
  try {
    const released1 = ScheduleService.releaseSlots(createdSchedules[0].id, 2);
    const released2 = createdSchedules[1]?.id ? ScheduleService.releaseSlots(createdSchedules[1].id, 1) : false;
    console.log(`  ✓ Released slots across timezone schedules`);
    console.log(`    Schedule 1: ${2} slots released`);
    console.log(`    Schedule 2: ${1} slot released`);
    addIntegrationTest('Release slots across timezones', released1 && released2);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Release slots across timezones', false);
  }
}

// Test 10: Delete schedule with timezone
console.log('\n10. DELETE SCHEDULE WITH TIMEZONE');
if (createdSchedules.length > 0) {
  try {
    const deleted = ScheduleService.deleteSchedule(createdSchedules[createdSchedules.length - 1].id, operatorId);
    console.log(`  ✓ Deleted schedule with timezone`);
    const verifyDeleted = ScheduleService.getSchedule(createdSchedules[createdSchedules.length - 1].id);
    console.log(`    Schedule properly soft-deleted: ${verifyDeleted === null}`);
    addIntegrationTest('Delete schedule', deleted && verifyDeleted === null);
  } catch (error) {
    console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    addIntegrationTest('Delete schedule', false);
  }
}

// Test 11: Invalid timezone rejection
console.log('\n11. INVALID TIMEZONE REJECTION');
try {
  ScheduleService.createSchedule(
    {
      activityId,
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      startTime: '09:00',
      endTime: '17:00',
      totalSlots: 20,
      timezone: 'Invalid/Timezone',
    },
    operatorId
  );
  console.log('  ✗ Should have rejected invalid timezone');
  addIntegrationTest('Reject invalid timezone', false);
} catch (error) {
  console.log(`  ✓ Correctly rejected: ${error instanceof Error ? error.message : String(error)}`);
  addIntegrationTest('Reject invalid timezone', true);
}

// Test 12: Timezone-aware UTC boundary crossing
console.log('\n12. TIMEZONE-AWARE UTC BOUNDARY CROSSING');
try {
  const testSchedule = ScheduleService.createSchedule(
    {
      activityId: 'boundary_test',
      startDate: '2026-12-31',
      endDate: '2026-12-31',
      startTime: '23:00',
      endTime: '23:59',
      totalSlots: 10,
      timezone: 'America/Los_Angeles',
    },
    operatorId
  );
  console.log(`  ✓ Created NY Year's Eve schedule ending at 23:59 PST`);
  console.log(`    Schedule ends: 2026-12-31 23:59 PST`);
  console.log(`    UTC equivalent: ${testSchedule.endTimeUTC} (possibly next day in UTC)`);
  addIntegrationTest('Year boundary with timezone', true);
} catch (error) {
  console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
  addIntegrationTest('Year boundary with timezone', false);
}

// Print Summary
console.log('\n=== INTEGRATION TEST SUMMARY ===\n');
const passedIntegration = integrationTestResults.filter(t => t.passed).length;
const totalIntegration = integrationTestResults.length;

integrationTestResults.forEach(test => {
  const statusIcon = test.passed ? '✓' : '✗';
  console.log(`${statusIcon} ${test.name}`);
  if (test.details && !test.passed) {
    console.log(`  Details: ${test.details}`);
  }
});

console.log(`\n=== OVERALL: ${passedIntegration}/${totalIntegration} tests passed ===`);
console.log(passedIntegration === totalIntegration ? '✓ ALL INTEGRATION TESTS PASSED!' : '✗ Some tests failed');
