import { ScheduleService } from './src/services/scheduleService';

console.log('Testing availabilityOnly filter...\n');

(async () => {
  try {
    // Create test schedules
    console.log('1. Creating test schedules...');

    const schedule1 = await ScheduleService.createSchedule(
      {
        activityId: 'test_activity_001',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        startTime: '09:00',
        endTime: '17:00',
        totalSlots: 5,
        timezone: 'UTC',
      },
      'operator_001'
    );
    console.log(`✓ Created schedule 1 with ${schedule1.totalSlots} slots`);

    const schedule2 = await ScheduleService.createSchedule(
      {
        activityId: 'test_activity_001',
        startDate: '2026-06-06',
        endDate: '2026-06-10',
        startTime: '10:00',
        endTime: '18:00',
        totalSlots: 5,
        timezone: 'UTC',
      },
      'operator_001'
    );
    console.log(`✓ Created schedule 2 with ${schedule2.totalSlots} slots`);

    // Book all slots in schedule1
    console.log('\n2. Booking all slots in schedule 1...');
    await ScheduleService.bookSlots(schedule1.id, 5);
    const bookedSchedule1 = await ScheduleService.getSchedule(schedule1.id);
    console.log(`✓ Schedule 1 now has ${bookedSchedule1?.bookedSlots}/${bookedSchedule1?.totalSlots} slots booked`);
    console.log(`  Available: ${bookedSchedule1?.availableCount}, Is Full: ${bookedSchedule1?.isFull}`);

    // Get all schedules without filter
    console.log('\n3. Getting all schedules for activity...');
    const allSchedules = await ScheduleService.getSchedulesByActivity('test_activity_001', false);
    console.log(`✓ Found ${allSchedules.length} total schedules`);
    allSchedules.forEach((s, i) => {
      console.log(`  Schedule ${i + 1}: ${s.availableCount} available, isFull: ${s.isFull}`);
    });

    // Get only available schedules
    console.log('\n4. Getting only schedules with availability (availabilityOnly=true)...');
    const availableSchedules = await ScheduleService.getSchedulesByActivity('test_activity_001', true);
    console.log(`✓ Found ${availableSchedules.length} schedules with available slots`);
    availableSchedules.forEach((s, i) => {
      console.log(`  Schedule ${i + 1}: ${s.availableCount} available, isFull: ${s.isFull}`);
    });

    // Verify the filter worked correctly
    console.log('\n5. Verification:');
    if (allSchedules.length === 2 && availableSchedules.length === 1) {
      console.log('✓ Filter correctly returned only schedules with available slots');
    } else {
      console.log(`✗ Filter returned unexpected results: total=${allSchedules.length}, available=${availableSchedules.length}`);
    }

    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
})();
