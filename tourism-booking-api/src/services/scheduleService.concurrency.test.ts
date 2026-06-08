import { ScheduleService } from './scheduleService';
import { db, closeDb } from '../db';
import { schedules } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('ScheduleService - Concurrency Tests', () => {
  beforeAll(async () => {
    // Ensure database is ready
    await db.select().from(schedules).limit(1);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should handle 100 concurrent booking attempts without race conditions', async () => {
    // Create a test schedule with 50 available slots
    const schedule = await ScheduleService.createSchedule(
      {
        activityId: '1',
        startDate: '2026-12-01',
        endDate: '2026-12-01',
        startTime: '10:00',
        endTime: '12:00',
        timezone: 'UTC',
        totalSlots: 50,
      },
      '1'
    );

    const scheduleId = schedule.id;

    // Attempt 100 concurrent bookings of 1 slot each
    const bookingPromises = Array.from({ length: 100 }, (_, i) =>
      ScheduleService.bookSlots(scheduleId, 1).catch(() => null)
    );

    const results = await Promise.all(bookingPromises);
    const successfulBookings = results.filter(r => r !== null).length;

    // Should have exactly 50 successful bookings (filling the schedule)
    expect(successfulBookings).toBe(50);

    // Verify final state
    const finalSchedule = await ScheduleService.getSchedule(scheduleId);
    expect(finalSchedule).not.toBeNull();
    expect(finalSchedule!.bookedSlots).toBe(50);
    expect(finalSchedule!.availableCount).toBe(0);
    expect(finalSchedule!.isFull).toBe(true);
  });

  it('should prevent overbooking with concurrent requests', async () => {
    // Create a schedule with 10 slots
    const schedule = await ScheduleService.createSchedule(
      {
        activityId: '2',
        startDate: '2026-12-02',
        endDate: '2026-12-02',
        startTime: '14:00',
        endTime: '16:00',
        timezone: 'UTC',
        totalSlots: 10,
      },
      '2'
    );

    // Attempt 20 concurrent bookings of 1 slot each
    const bookingPromises = Array.from({ length: 20 }, () =>
      ScheduleService.bookSlots(schedule.id, 1).catch(() => null)
    );

    const results = await Promise.all(bookingPromises);
    const successfulBookings = results.filter(r => r !== null).length;

    // Should have exactly 10 successful bookings
    expect(successfulBookings).toBe(10);

    // Verify the schedule is full
    const finalSchedule = await ScheduleService.getSchedule(schedule.id);
    expect(finalSchedule!.bookedSlots).toBe(10);
    expect(finalSchedule!.isFull).toBe(true);
  });

  it('should handle concurrent booking and release operations', async () => {
    // Create a schedule with 20 slots
    const schedule = await ScheduleService.createSchedule(
      {
        activityId: '3',
        startDate: '2026-12-03',
        endDate: '2026-12-03',
        startTime: '18:00',
        endTime: '20:00',
        timezone: 'UTC',
        totalSlots: 20,
      },
      '3'
    );

    // Book 15 slots
    await ScheduleService.bookSlots(schedule.id, 15);

    // Simultaneously try to book 10 more and release 5
    const [bookResult, releaseResult] = await Promise.all([
      ScheduleService.bookSlots(schedule.id, 10).catch(() => null),
      ScheduleService.releaseSlots(schedule.id, 5).catch(() => null),
    ]);

    // Both operations should succeed
    expect(bookResult).not.toBeNull();
    expect(releaseResult).not.toBeNull();

    // Final state: 15 - 5 + 10 = 20 booked slots
    const finalSchedule = await ScheduleService.getSchedule(schedule.id);
    expect(finalSchedule!.bookedSlots).toBe(20);
  });

  it('should enforce database constraint preventing booked > total', async () => {
    // Create a schedule with 5 slots
    const schedule = await ScheduleService.createSchedule(
      {
        activityId: '4',
        startDate: '2026-12-04',
        endDate: '2026-12-04',
        startTime: '09:00',
        endTime: '11:00',
        timezone: 'UTC',
        totalSlots: 5,
      },
      '4'
    );

    // Try to book more slots than available - this should fail or be rejected
    try {
      await ScheduleService.bookSlots(schedule.id, 10);
      fail('Should have thrown an error');
    } catch (error: any) {
      // Expected: insufficient slots error
      expect(error.message).toContain('Insufficient');
    }

    // Verify schedule wasn't changed
    const finalSchedule = await ScheduleService.getSchedule(schedule.id);
    expect(finalSchedule!.bookedSlots).toBe(0);
  });

  it('should calculate availability correctly', async () => {
    const schedule = await ScheduleService.createSchedule(
      {
        activityId: '5',
        startDate: '2026-12-05',
        endDate: '2026-12-05',
        startTime: '13:00',
        endTime: '15:00',
        timezone: 'UTC',
        totalSlots: 25,
      },
      '5'
    );

    // Book some slots
    const booked = await ScheduleService.bookSlots(schedule.id, 10);
    expect(booked.availableCount).toBe(15);
    expect(booked.isFull).toBe(false);

    // Book remaining slots
    const fullyBooked = await ScheduleService.bookSlots(schedule.id, 15);
    expect(fullyBooked.availableCount).toBe(0);
    expect(fullyBooked.isFull).toBe(true);
  });
});
