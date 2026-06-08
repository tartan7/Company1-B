import { ScheduleService } from './scheduleService';
import { closeDb } from '../db';
/**
 * Load test for concurrent booking performance
 * Tests the system's ability to handle 100+ concurrent booking attempts
 */
async function runLoadTest() {
    console.log('Starting load test for concurrent bookings...\n');
    try {
        // Create a test schedule with 1000 slots for high concurrency test
        console.log('Creating test schedule with 1000 slots...');
        const schedule = await ScheduleService.createSchedule({
            activityId: '100',
            startDate: '2026-12-20',
            endDate: '2026-12-20',
            startTime: '08:00',
            endTime: '18:00',
            timezone: 'UTC',
            totalSlots: 1000,
        }, '100');
        console.log(`✓ Schedule created: ${schedule.id}`);
        console.log(`  Total slots: ${schedule.totalSlots}`);
        console.log(`  Available: ${schedule.availableCount}\n`);
        // Test 1: Concurrent bookings (100 concurrent requests, 1 slot each)
        console.log('Test 1: 100 concurrent bookings (1 slot each)');
        const startTime1 = Date.now();
        const bookingPromises1 = Array.from({ length: 100 }, () => ScheduleService.bookSlots(schedule.id, 1).catch(() => null));
        const results1 = await Promise.all(bookingPromises1);
        const successful1 = results1.filter(r => r !== null).length;
        const duration1 = Date.now() - startTime1;
        console.log(`✓ Completed in ${duration1}ms`);
        console.log(`  Successful bookings: ${successful1}/100`);
        console.log(`  Success rate: ${(successful1 / 100 * 100).toFixed(2)}%\n`);
        // Verify final state
        const afterTest1 = await ScheduleService.getSchedule(schedule.id);
        console.log(`Current state after Test 1:`);
        console.log(`  Booked slots: ${afterTest1.bookedSlots}`);
        console.log(`  Available: ${afterTest1.availableCount}`);
        console.log(`  Is full: ${afterTest1.isFull}\n`);
        // Test 2: High-volume concurrent bookings (200 concurrent requests, 2 slots each)
        console.log('Test 2: 200 concurrent bookings (2 slots each)');
        const startTime2 = Date.now();
        const bookingPromises2 = Array.from({ length: 200 }, () => ScheduleService.bookSlots(schedule.id, 2).catch(() => null));
        const results2 = await Promise.all(bookingPromises2);
        const successful2 = results2.filter(r => r !== null).length;
        const duration2 = Date.now() - startTime2;
        console.log(`✓ Completed in ${duration2}ms`);
        console.log(`  Successful bookings: ${successful2}/200`);
        console.log(`  Success rate: ${(successful2 / 200 * 100).toFixed(2)}%\n`);
        const afterTest2 = await ScheduleService.getSchedule(schedule.id);
        console.log(`Current state after Test 2:`);
        console.log(`  Booked slots: ${afterTest2.bookedSlots}`);
        console.log(`  Available: ${afterTest2.availableCount}`);
        console.log(`  Is full: ${afterTest2.isFull}\n`);
        // Test 3: Mixed operations - bookings and releases
        console.log('Test 3: Mixed operations (150 bookings + 75 releases concurrently)');
        const startTime3 = Date.now();
        const mixedPromises = [
            ...Array.from({ length: 150 }, () => ScheduleService.bookSlots(schedule.id, 1).catch(() => null)),
            ...Array.from({ length: 75 }, () => ScheduleService.releaseSlots(schedule.id, 1).catch(() => null)),
        ];
        const results3 = await Promise.all(mixedPromises);
        const duration3 = Date.now() - startTime3;
        const successful3 = results3.filter(r => r !== null).length;
        console.log(`✓ Completed in ${duration3}ms`);
        console.log(`  Successful operations: ${successful3}/225`);
        console.log(`  Success rate: ${(successful3 / 225 * 100).toFixed(2)}%\n`);
        const afterTest3 = await ScheduleService.getSchedule(schedule.id);
        console.log(`Current state after Test 3:`);
        console.log(`  Booked slots: ${afterTest3.bookedSlots}`);
        console.log(`  Available: ${afterTest3.availableCount}`);
        console.log(`  Is full: ${afterTest3.isFull}\n`);
        // Summary
        console.log('=== LOAD TEST SUMMARY ===');
        console.log(`Total duration: ${duration1 + duration2 + duration3}ms`);
        console.log(`Average response time:`);
        console.log(`  Test 1: ${(duration1 / 100).toFixed(2)}ms per request`);
        console.log(`  Test 2: ${(duration2 / 200).toFixed(2)}ms per request`);
        console.log(`  Test 3: ${(duration3 / 225).toFixed(2)}ms per request`);
        console.log(`\nFinal Schedule State:`);
        console.log(`  Total slots: ${afterTest3.totalSlots}`);
        console.log(`  Booked slots: ${afterTest3.bookedSlots}`);
        console.log(`  Available: ${afterTest3.availableCount}`);
        // Verify no constraint violations
        if (afterTest3.bookedSlots <= afterTest3.totalSlots) {
            console.log(`✓ Database constraint verified: booked_slots <= total_slots`);
        }
        else {
            console.log(`✗ CONSTRAINT VIOLATION: booked_slots > total_slots`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Load test failed:', error);
        process.exit(1);
    }
    finally {
        await closeDb();
    }
}
runLoadTest().then(() => {
    console.log('\n✓ Load test completed successfully');
    process.exit(0);
});
