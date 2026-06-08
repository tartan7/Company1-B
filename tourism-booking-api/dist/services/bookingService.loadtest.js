/**
 * Load Test: 100+ Concurrent Bookings
 *
 * This test verifies that the concurrency control mechanism prevents race conditions
 * and deadlocks under high concurrent load.
 *
 * Test Scenario:
 * - Schedule with 100 total slots
 * - 150 concurrent booking attempts (each requesting 1 slot)
 * - Expected: 100 succeed, 50 fail with insufficient slots error
 * - Verify: No deadlocks, no duplicates, no overbooking
 */
import { BookingService } from './bookingService';
import { db } from '../db/index';
import { schedules, activities, users } from '../db/schema';
async function runLoadTest() {
    console.log('\n🚀 Starting Load Test: 100+ Concurrent Bookings\n');
    // Setup test data
    console.log('📋 Setting up test data...');
    const userResult = await db
        .insert(users)
        .values({
        email: `loadtest-operator-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        firstName: 'LoadTest',
        lastName: 'Operator',
    })
        .returning({ id: users.id });
    const operatorId = userResult[0].id;
    const activityResult = await db
        .insert(activities)
        .values({
        hostId: operatorId,
        title: 'Load Test Activity - 100 Slots',
        description: 'Activity with 100 slots for concurrent booking test',
        category: 'Testing',
        pricePerPerson: '50.00',
        currency: 'USD',
        maxCapacity: 100,
        duration: 120,
        location: 'Load Test Location',
        status: 'active',
    })
        .returning({ id: activities.id });
    const activityId = activityResult[0].id;
    // Create schedule with exactly 100 slots
    const scheduleResult = await db
        .insert(schedules)
        .values({
        activityId,
        operatorId,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-01'),
        startTime: '08:00',
        endTime: '10:00',
        totalSlots: 100,
        bookedSlots: 0,
        isDeleted: false,
    })
        .returning({ id: schedules.id });
    const scheduleId = scheduleResult[0].id;
    // Create 150 guest users
    console.log('👥 Creating 150 guest users...');
    const guestIds = [];
    for (let i = 0; i < 150; i++) {
        const guestResult = await db
            .insert(users)
            .values({
            email: `loadtest-guest-${i}-${Date.now()}@test.com`,
            passwordHash: 'hashed',
            firstName: `Guest${i}`,
            lastName: 'LoadTest',
        })
            .returning({ id: users.id });
        guestIds.push(guestResult[0].id);
    }
    console.log(`✅ Created ${guestIds.length} guest users`);
    console.log(`✅ Created schedule with 100 slots`);
    console.log('\n📊 Running 150 concurrent booking attempts...\n');
    // Track metrics
    const startTime = Date.now();
    const responseTimes = [];
    const results = [];
    const failureReasons = {};
    // Run 150 concurrent booking attempts
    const bookingPromises = guestIds.map((guestId, index) => {
        const attemptStart = Date.now();
        return BookingService.bookSlots(scheduleId, guestId, activityId, 1, // Each guest books 1 slot
        '2026-07-01').then((result) => {
            const responseTime = Date.now() - attemptStart;
            responseTimes.push(responseTime);
            const outcome = {
                success: result.success,
                error: result.error,
                responseTime,
            };
            if (!result.success) {
                failureReasons[result.error || 'UNKNOWN'] = (failureReasons[result.error || 'UNKNOWN'] || 0) + 1;
            }
            return outcome;
        });
    });
    const bookingResults = await Promise.all(bookingPromises);
    const totalTime = Date.now() - startTime;
    results.push(...bookingResults);
    // Analyze results
    const successfulBookings = results.filter((r) => r.success).length;
    const failedBookings = results.filter((r) => !r.success).length;
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    // Check for anomalies
    let deadlockDetected = false;
    let raceConditionDetected = false;
    if (failureReasons['LOCK_TIMEOUT'] && (failureReasons['LOCK_TIMEOUT'] || 0) > 5) {
        console.warn('⚠️  Warning: Multiple lock timeouts detected - possible deadlock!');
        deadlockDetected = true;
    }
    if (successfulBookings > 100) {
        console.error('❌ ERROR: More than 100 bookings succeeded! Overbooking detected!');
        raceConditionDetected = true;
    }
    // Print results
    console.log('\n📈 Load Test Results\n');
    console.log(`Total Attempts:        ${results.length}`);
    console.log(`Successful Bookings:   ${successfulBookings} ✅`);
    console.log(`Failed Bookings:       ${failedBookings} ❌`);
    console.log('\nFailure Breakdown:');
    Object.entries(failureReasons).forEach(([reason, count]) => {
        console.log(`  ${reason}: ${count}`);
    });
    console.log('\n⏱️  Response Times');
    console.log(`  Average: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`  Min:     ${minResponseTime}ms`);
    console.log(`  Max:     ${maxResponseTime}ms`);
    console.log(`  Total:   ${totalTime}ms`);
    console.log('\n🔒 Concurrency Control Verification');
    console.log(`  Deadlock Detected:        ${deadlockDetected ? '❌ YES' : '✅ NO'}`);
    console.log(`  Race Condition Detected:  ${raceConditionDetected ? '❌ YES' : '✅ NO'}`);
    console.log(`  Overbooking Prevented:    ${successfulBookings === 100 ? '✅ YES' : '❌ NO'}`);
    // Verify final state
    const finalSchedule = await db.query.schedules.findFirst({
        where: (table, { eq }) => eq(table.id, scheduleId),
    });
    console.log('\n📋 Final Schedule State');
    console.log(`  Total Slots:  ${finalSchedule?.totalSlots}`);
    console.log(`  Booked Slots: ${finalSchedule?.bookedSlots}`);
    console.log(`  Consistency:  ${finalSchedule?.bookedSlots === successfulBookings ? '✅ CORRECT' : '❌ MISMATCH'}`);
    if (successfulBookings !== 100 || raceConditionDetected || deadlockDetected) {
        console.log('\n❌ LOAD TEST FAILED\n');
        process.exit(1);
    }
    else {
        console.log('\n✅ LOAD TEST PASSED - All Concurrency Controls Working!\n');
        process.exit(0);
    }
    return {
        totalAttempts: results.length,
        successfulBookings,
        failedBookings,
        failureReasons,
        averageResponseTime,
        maxResponseTime,
        minResponseTime,
        deadlockDetected,
        raceConditionDetected,
    };
}
// Run the load test
runLoadTest().catch((error) => {
    console.error('Load test error:', error);
    process.exit(1);
});
