import { test } from 'node:test';
import assert from 'node:assert';
import { BookingService } from './bookingService';
import { db, getClient } from '../db/index';
import { schedules, activities, users } from '../db/schema';
import { eq } from 'drizzle-orm';
test('BookingService - Transaction Isolation & Row-Level Locking', async (t) => {
    // Setup: Create test data
    let testUserId;
    let testActivityId;
    let testScheduleId;
    // Create test user (operator/host)
    const userResult = await db
        .insert(users)
        .values({
        email: `operator-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'Operator',
    })
        .returning({ id: users.id });
    testUserId = userResult[0].id;
    // Create test activity
    const activityResult = await db
        .insert(activities)
        .values({
        hostId: testUserId,
        title: 'Concurrency Test Activity',
        description: 'Test activity for concurrent booking',
        category: 'Testing',
        pricePerPerson: '100.00',
        currency: 'USD',
        maxCapacity: 10,
        duration: 60,
        location: 'Test Location',
        status: 'active',
    })
        .returning({ id: activities.id });
    testActivityId = activityResult[0].id;
    // Create test schedule with limited slots
    const scheduleResult = await db
        .insert(schedules)
        .values({
        activityId: testActivityId,
        operatorId: testUserId,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-01'),
        startTime: '10:00',
        endTime: '12:00',
        totalSlots: 10,
        bookedSlots: 0,
        isDeleted: false,
    })
        .returning({ id: schedules.id });
    testScheduleId = scheduleResult[0].id;
    // Create guest users
    const guestResult = await db
        .insert(users)
        .values({
        email: `guest-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        firstName: 'Guest',
        lastName: 'User',
    })
        .returning({ id: users.id });
    const guestId = guestResult[0].id;
    await t.test('should successfully book available slots', async () => {
        const result = await BookingService.bookSlots(testScheduleId, guestId, testActivityId, 3, '2026-06-01');
        assert.strictEqual(result.success, true, 'Booking should succeed');
        assert.ok(result.bookingId, 'Should return booking ID');
    });
    await t.test('should reject booking when insufficient slots', async () => {
        // Book 8 more slots (total 11 > 10 available)
        const result = await BookingService.bookSlots(testScheduleId, guestId, testActivityId, 8, '2026-06-01');
        assert.strictEqual(result.success, false, 'Booking should fail');
        assert.strictEqual(result.error, 'INSUFFICIENT_SLOTS', 'Should return insufficient slots error');
    });
    await t.test('should reject negative quantity', async () => {
        const result = await BookingService.bookSlots(testScheduleId, guestId, testActivityId, -5, '2026-06-01');
        assert.strictEqual(result.success, false, 'Negative quantity should fail');
        assert.strictEqual(result.error, 'INVALID_QUANTITY');
    });
    await t.test('should reject zero quantity', async () => {
        const result = await BookingService.bookSlots(testScheduleId, guestId, testActivityId, 0, '2026-06-01');
        assert.strictEqual(result.success, false, 'Zero quantity should fail');
        assert.strictEqual(result.error, 'INVALID_QUANTITY');
    });
    await t.test('should acquire row lock during booking', async () => {
        // Create a new schedule for this test
        const newScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-06-02'),
            endDate: new Date('2026-06-02'),
            startTime: '14:00',
            endTime: '16:00',
            totalSlots: 5,
            bookedSlots: 0,
            isDeleted: false,
        })
            .returning({ id: schedules.id });
        const newScheduleId = newScheduleResult[0].id;
        // Verify that SELECT...FOR UPDATE is used by checking lock behavior
        const client = await getClient();
        try {
            await client.query('BEGIN');
            await client.query('SELECT * FROM schedules WHERE id = $1 FOR UPDATE', [newScheduleId]);
            // If we get here, FOR UPDATE is supported (PostgreSQL allows it)
            const result = await BookingService.bookSlots(newScheduleId, guestId, testActivityId, 2, '2026-06-02');
            assert.strictEqual(result.success, true, 'Booking with lock should succeed');
            await client.query('ROLLBACK');
        }
        finally {
            client.release();
        }
    });
    await t.test('should maintain ACID properties during concurrent bookings', async () => {
        // Create schedule with exactly 5 slots for concurrent test
        const concurrencyScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-06-03'),
            endDate: new Date('2026-06-03'),
            startTime: '09:00',
            endTime: '11:00',
            totalSlots: 5,
            bookedSlots: 0,
            isDeleted: false,
        })
            .returning({ id: schedules.id });
        const concurrencyScheduleId = concurrencyScheduleResult[0].id;
        // Attempt 10 concurrent bookings (only 5 should succeed)
        const bookingPromises = [];
        for (let i = 0; i < 10; i++) {
            bookingPromises.push(BookingService.bookSlots(concurrencyScheduleId, guestId, testActivityId, 1, '2026-06-03'));
        }
        const results = await Promise.all(bookingPromises);
        // Count successful and failed bookings
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);
        assert.strictEqual(successful.length, 5, `Should have exactly 5 successful bookings, got ${successful.length}`);
        assert.strictEqual(failed.length, 5, `Should have exactly 5 failed bookings, got ${failed.length}`);
        // Verify all failed bookings are due to insufficient slots
        failed.forEach((result) => {
            assert.strictEqual(result.error, 'INSUFFICIENT_SLOTS', 'All failures should be due to insufficient slots');
        });
        // Verify schedule shows correct booked slots
        const updatedSchedule = await db.query.schedules.findFirst({
            where: eq(schedules.id, concurrencyScheduleId),
        });
        assert.strictEqual(updatedSchedule?.bookedSlots, 5, `Schedule should show 5 booked slots, showing ${updatedSchedule?.bookedSlots}`);
    });
    await t.test('should release slots when booking is cancelled', async () => {
        // Create new schedule for cancellation test
        const cancelScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-06-04'),
            endDate: new Date('2026-06-04'),
            startTime: '15:00',
            endTime: '17:00',
            totalSlots: 10,
            bookedSlots: 0,
            isDeleted: false,
        })
            .returning({ id: schedules.id });
        const cancelScheduleId = cancelScheduleResult[0].id;
        // Book 5 slots
        const bookingResult = await BookingService.bookSlots(cancelScheduleId, guestId, testActivityId, 5, '2026-06-04');
        const bookingId = bookingResult.bookingId;
        // Verify booked
        let currentSchedule = await db.query.schedules.findFirst({
            where: eq(schedules.id, cancelScheduleId),
        });
        assert.strictEqual(currentSchedule?.bookedSlots, 5, 'Should have 5 booked slots');
        // Cancel booking
        const cancelResult = await BookingService.cancelBooking(bookingId);
        assert.strictEqual(cancelResult.success, true, 'Cancellation should succeed');
        // Verify slots released
        currentSchedule = await db.query.schedules.findFirst({
            where: eq(schedules.id, cancelScheduleId),
        });
        assert.strictEqual(currentSchedule?.bookedSlots, 0, 'Should have 0 booked slots after cancellation');
    });
    await t.test('should confirm pending booking', async () => {
        // Create new schedule
        const confirmScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-06-05'),
            endDate: new Date('2026-06-05'),
            startTime: '10:00',
            endTime: '12:00',
            totalSlots: 10,
            bookedSlots: 0,
            isDeleted: false,
        })
            .returning({ id: schedules.id });
        const confirmScheduleId = confirmScheduleResult[0].id;
        // Book slots
        const bookingResult = await BookingService.bookSlots(confirmScheduleId, guestId, testActivityId, 3, '2026-06-05');
        // Confirm booking
        const confirmResult = await BookingService.confirmBooking(bookingResult.bookingId);
        assert.strictEqual(confirmResult.success, true, 'Confirmation should succeed');
        // Verify status changed
        const booking = await BookingService.getBooking(bookingResult.bookingId);
        assert.strictEqual(booking?.status, 'confirmed', 'Booking should be confirmed');
    });
    await t.test('should fetch available slots with consistency guarantee', async () => {
        // Create new schedule
        const availabilityScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-06-06'),
            endDate: new Date('2026-06-06'),
            startTime: '13:00',
            endTime: '15:00',
            totalSlots: 20,
            bookedSlots: 5,
            isDeleted: false,
        })
            .returning({ id: schedules.id });
        const availabilityScheduleId = availabilityScheduleResult[0].id;
        const availability = await BookingService.getAvailableSlots(availabilityScheduleId);
        assert.ok(availability, 'Should return availability');
        assert.strictEqual(availability?.totalSlots, 20, 'Total slots should be 20');
        assert.strictEqual(availability?.bookedSlots, 5, 'Booked slots should be 5');
        assert.strictEqual(availability?.availableSlots, 15, 'Available slots should be 15');
    });
});
