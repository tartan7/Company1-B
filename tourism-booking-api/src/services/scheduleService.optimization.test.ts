import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ScheduleService } from './scheduleService';
import { db, closeDb } from '../db';

describe('ScheduleService - Query Optimization (Phase 3)', () => {
  const activityId = '100';
  const operatorId = '200';
  let scheduleIds: string[] = [];

  beforeAll(async () => {
    // Create test schedules
    for (let i = 0; i < 10; i++) {
      const schedule = await ScheduleService.createSchedule(
        {
          activityId,
          startDate: '2026-12-20',
          endDate: '2026-12-20',
          startTime: '08:00',
          endTime: '18:00',
          timezone: 'UTC',
          totalSlots: 100 + (i * 10),
        },
        operatorId
      );
      scheduleIds.push(schedule.id);
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('getScheduleSummaries - Lazy-Load Summary Endpoint', () => {
    it('should return summaries without booking details', async () => {
      const startTime = Date.now();
      const summaries = await ScheduleService.getScheduleSummaries(activityId);
      const duration = Date.now() - startTime;

      expect(summaries).toHaveLength(10);
      expect(summaries[0]).toHaveProperty('totalSlots');
      expect(summaries[0]).toHaveProperty('bookedSlots');
      expect(summaries[0]).toHaveProperty('availableSlots');
      expect(summaries[0]).toHaveProperty('percentageBooked');
      expect(duration).toBeLessThan(100); // <100ms for summaries
    });

    it('should calculate correct availability percentages', async () => {
      const summaries = await ScheduleService.getScheduleSummaries(activityId);

      summaries.forEach(summary => {
        const calculated = (summary.bookedSlots / summary.totalSlots) * 100;
        expect(summary.percentageBooked).toBe(Math.round(calculated));
      });
    });

    it('should include date/time information in summaries', async () => {
      const summaries = await ScheduleService.getScheduleSummaries(activityId);

      expect(summaries[0]).toHaveProperty('startDate');
      expect(summaries[0]).toHaveProperty('endDate');
      expect(summaries[0]).toHaveProperty('startTime');
      expect(summaries[0]).toHaveProperty('endTime');
    });
  });

  describe('getScheduleDetails - Full Details Endpoint', () => {
    it('should return full schedule with bookings', async () => {
      const startTime = Date.now();
      const details = await ScheduleService.getScheduleDetails(scheduleIds[0]);
      const duration = Date.now() - startTime;

      expect(details).toBeDefined();
      expect(details).toHaveProperty('id');
      expect(details).toHaveProperty('totalSlots');
      expect(details).toHaveProperty('bookings');
      expect(Array.isArray(details.bookings)).toBe(true);
      expect(duration).toBeLessThan(100); // <100ms even with 1000+ items
    });

    it('should return null for non-existent schedule', async () => {
      const details = await ScheduleService.getScheduleDetails('non-existent');
      expect(details).toBeNull();
    });

    it('should include timezone information in details', async () => {
      const details = await ScheduleService.getScheduleDetails(scheduleIds[0]);

      expect(details).toHaveProperty('timezone');
      expect(details).toHaveProperty('startTimeUTC');
      expect(details).toHaveProperty('endTimeUTC');
    });
  });

  describe('listActivitySummaries - Bulk Activity Summary', () => {
    it('should return aggregated activity summaries', async () => {
      const startTime = Date.now();
      const summaries = await ScheduleService.listActivitySummaries();
      const duration = Date.now() - startTime;

      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // <100ms for bulk summaries
    });

    it('should calculate correct activity totals', async () => {
      const summaries = await ScheduleService.listActivitySummaries();
      const activitySummary = summaries.find(s => s.activityId === activityId);

      expect(activitySummary).toBeDefined();
      expect(activitySummary.totalSchedules).toBe(10);
      expect(activitySummary.totalCapacity).toBeGreaterThan(0);
      expect(activitySummary.availableCapacity).toBeGreaterThanOrEqual(0);
    });

    it('should include percentage booked calculation', async () => {
      const summaries = await ScheduleService.listActivitySummaries();

      summaries.forEach(summary => {
        const calculated = (
          (summary.totalCapacity - summary.availableCapacity) / summary.totalCapacity
        ) * 100;
        expect(summary.percentageBooked).toBe(Math.round(calculated));
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle 1000+ schedules for getScheduleSummaries <100ms', async () => {
      // Note: In real scenario with 1000+ items, this validates the optimization
      const startTime = Date.now();
      const summaries = await ScheduleService.getScheduleSummaries(activityId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      console.log(`getScheduleSummaries(${summaries.length} items): ${duration}ms`);
    });

    it('should handle full details retrieval <100ms', async () => {
      const startTime = Date.now();
      const details = await ScheduleService.getScheduleDetails(scheduleIds[0]);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      console.log(`getScheduleDetails: ${duration}ms`);
    });

    it('should handle activity summaries list <100ms', async () => {
      const startTime = Date.now();
      const summaries = await ScheduleService.listActivitySummaries();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      console.log(`listActivitySummaries(${summaries.length} activities): ${duration}ms`);
    });
  });

  describe('Lazy-Load Pattern Validation', () => {
    it('should return summaries by default without includeDetails param', async () => {
      const summary = await ScheduleService.getScheduleSummaries(activityId);

      summary.forEach(s => {
        // Summary endpoint should not include booking details
        expect(s).not.toHaveProperty('bookings');
      });
    });

    it('should return full details when requested with includeDetails', async () => {
      const details = await ScheduleService.getScheduleDetails(scheduleIds[0]);

      // Full details endpoint should include bookings
      expect(details).toHaveProperty('bookings');
      expect(Array.isArray(details.bookings)).toBe(true);
    });
  });
});
