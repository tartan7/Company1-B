import { test } from 'node:test';
import assert from 'node:assert';
import { ScheduleService } from './scheduleService';
import { BookingService } from './bookingService';
import { SnapshotService } from './snapshotService';
import { db } from '../db/index';
import { schedules, bookings, activities, users, resourceVersions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
test('Publish Workflow - Schedule and Booking Publishing', async (t) => {
    let testUserId;
    let testActivityId;
    let testScheduleId;
    let testBookingId;
    let guestId;
    // Setup: Create test data
    await t.test('setup - create test users and activity', async () => {
        // Create test user (operator/host)
        const userResult = await db
            .insert(users)
            .values({
            email: `operator-publish-${Date.now()}@test.com`,
            passwordHash: 'hashed',
            firstName: 'Test',
            lastName: 'Operator',
        })
            .returning();
        testUserId = userResult[0].id;
        // Create guest user
        const guestResult = await db
            .insert(users)
            .values({
            email: `guest-publish-${Date.now()}@test.com`,
            passwordHash: 'hashed',
            firstName: 'Guest',
            lastName: 'User',
        })
            .returning();
        guestId = guestResult[0].id;
        // Create test activity
        const activityResult = await db
            .insert(activities)
            .values({
            hostId: testUserId,
            title: 'Publishing Test Activity',
            description: 'Test activity for publishing workflow',
            category: 'Testing',
            pricePerPerson: '100.00',
            currency: 'USD',
            maxCapacity: 20,
            duration: 60,
            location: 'Test Location',
            status: 'active',
        })
            .returning();
        testActivityId = activityResult[0].id;
    });
    // Test Schedule Publishing
    await t.test('should publish a schedule', async () => {
        // Create a schedule
        const scheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-07-01'),
            endDate: new Date('2026-07-05'),
            startTime: '09:00',
            endTime: '17:00',
            timezone: 'UTC',
            totalSlots: 20,
            bookedSlots: 0,
            isDeleted: false,
        })
            .returning();
        testScheduleId = scheduleResult[0].id;
        // Publish the schedule
        const publishResult = await ScheduleService.publishSchedule(testScheduleId.toString(), testUserId.toString());
        assert.strictEqual(publishResult.success, true);
        assert.strictEqual(publishResult.version, 2);
        assert.strictEqual(publishResult.resourceId, testScheduleId);
    });
    // Test Schedule Version Increment
    await t.test('should increment schedule version', async () => {
        const current = await db
            .select()
            .from(schedules)
            .where(eq(schedules.id, testScheduleId));
        assert.strictEqual(current[0].version, 2);
        assert.strictEqual(current[0].publishedAt !== null, true);
        assert.strictEqual(current[0].publishedBy, testUserId);
    });
    // Test Snapshot Storage
    await t.test('should create snapshot in resource_versions', async () => {
        const versions = await db
            .select()
            .from(resourceVersions)
            .where(and(eq(resourceVersions.resourceType, 'schedule'), eq(resourceVersions.resourceId, testScheduleId)));
        assert(versions.length > 0);
        const snapshot = versions[0];
        assert.strictEqual(snapshot.version, 2);
        assert.strictEqual(snapshot.status, 'published');
        assert.strictEqual(snapshot.isDeleted, false);
        const data = JSON.parse(snapshot.data);
        assert.strictEqual(data.id.toString(), testScheduleId.toString());
    });
    // Test Update Prevention on Published Schedule
    await t.test('should prevent updates to published schedule', async () => {
        const updateAttempt = await ScheduleService.updateSchedule(testScheduleId.toString(), { totalSlots: 25 }, testUserId.toString());
        assert.strictEqual(updateAttempt, null);
    });
    // Test Booking Publishing
    await t.test('should publish a confirmed booking', async () => {
        // Create a new schedule
        const newScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-08-01'),
            endDate: new Date('2026-08-05'),
            startTime: '10:00',
            endTime: '18:00',
            timezone: 'UTC',
            totalSlots: 15,
            bookedSlots: 1,
            isDeleted: false,
        })
            .returning();
        const newScheduleId = newScheduleResult[0].id;
        // Create a booking
        const bookingResult = await db
            .insert(bookings)
            .values({
            guestId,
            scheduleId: newScheduleId,
            activityId: testActivityId,
            quantity: 2,
            bookingDate: new Date('2026-08-01'),
            status: 'pending',
        })
            .returning();
        testBookingId = bookingResult[0].id;
        // Confirm the booking
        const confirmResult = await BookingService.confirmBooking(testBookingId);
        assert.strictEqual(confirmResult.success, true);
        // Publish the booking
        const publishResult = await BookingService.publishBooking(testBookingId, testUserId.toString());
        assert.strictEqual(publishResult.success, true);
        assert.strictEqual(publishResult.version, 2);
        assert.strictEqual(publishResult.resourceId, testBookingId);
    });
    // Test Booking Version Increment
    await t.test('should increment booking version', async () => {
        const current = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, testBookingId));
        assert.strictEqual(current[0].version, 2);
        assert.strictEqual(current[0].publishedAt !== null, true);
        assert.strictEqual(current[0].publishedBy, testUserId);
    });
    // Test Cancellation Prevention on Published Booking
    await t.test('should prevent cancellation of published booking', async () => {
        const cancelResult = await BookingService.cancelBooking(testBookingId);
        assert.strictEqual(cancelResult.success, false);
        assert.strictEqual(cancelResult.error, 'BOOKING_IMMUTABLE');
    });
    // Test Published Booking Cannot Be Published Again
    await t.test('should allow publishing only confirmed bookings', async () => {
        // Try to publish a pending booking (not confirmed)
        const newScheduleResult = await db
            .insert(schedules)
            .values({
            activityId: testActivityId,
            operatorId: testUserId,
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-09-05'),
            startTime: '09:00',
            endTime: '17:00',
            timezone: 'UTC',
            totalSlots: 10,
            bookedSlots: 1,
            isDeleted: false,
        })
            .returning();
        const newScheduleId = newScheduleResult[0].id;
        const pendingBookingResult = await db
            .insert(bookings)
            .values({
            guestId,
            scheduleId: newScheduleId,
            activityId: testActivityId,
            quantity: 1,
            bookingDate: new Date('2026-09-01'),
            status: 'pending',
        })
            .returning();
        const pendingBookingId = pendingBookingResult[0].id;
        const publishResult = await BookingService.publishBooking(pendingBookingId, testUserId.toString());
        assert.strictEqual(publishResult.success, false);
        assert.strictEqual(publishResult.error, 'INVALID_BOOKING_STATUS');
    });
    // Test Version History
    await t.test('should maintain version history in snapshots', async () => {
        const versions = await SnapshotService.listVersions('schedule', testScheduleId);
        assert(versions.length >= 1);
        const publishedVersion = versions.find((v) => v.status === 'published');
        assert(publishedVersion !== undefined);
        assert.strictEqual(publishedVersion?.publishedAt !== null, true);
    });
    // Test Get Version
    await t.test('should retrieve specific version snapshot', async () => {
        const versionSnapshot = await SnapshotService.getVersion('schedule', testScheduleId, 2);
        assert(versionSnapshot !== null);
        assert.strictEqual(versionSnapshot.version, 2);
        assert.strictEqual(versionSnapshot.status, 'published');
        assert.strictEqual(versionSnapshot.data.id.toString(), testScheduleId.toString());
    });
});
