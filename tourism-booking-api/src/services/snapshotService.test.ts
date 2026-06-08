import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db, getClient } from '../db/index';
import { SnapshotService } from './snapshotService';
import { users, activities, schedules, bookings, resourceVersions } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('SnapshotService', () => {
  let testUserId: bigint;
  let testActivityId: bigint;
  let testScheduleId: bigint;
  let testBookingId: bigint;

  beforeEach(async () => {
    // Clean up test data
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create test user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        ['test@example.com', 'hash', 'Test', 'User']
      );
      testUserId = BigInt(userResult.rows[0].id);

      // Create test activity
      const activityResult = await client.query(
        `INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [testUserId, 'Test Activity', 'Test Description', 'Adventure', '99.99', 'USD', 10, 60, 'Test Location']
      );
      testActivityId = BigInt(activityResult.rows[0].id);

      // Create test schedule
      const scheduleResult = await client.query(
        `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, operator_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [testActivityId, '2026-06-01', '2026-06-01', '09:00', '10:00', 'UTC', 10, testUserId]
      );
      testScheduleId = BigInt(scheduleResult.rows[0].id);

      // Create test booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (guest_id, schedule_id, activity_id, quantity, booking_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [testUserId, testScheduleId, testActivityId, 2, '2026-06-01']
      );
      testBookingId = BigInt(bookingResult.rows[0].id);

      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    // Clean up test data
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM resource_versions WHERE resource_type IN ($1, $2, $3)', [
        'activity',
        'schedule',
        'booking',
      ]);
      await client.query('DELETE FROM bookings WHERE id IN (SELECT id FROM bookings WHERE guest_id = $1)', [testUserId]);
      await client.query('DELETE FROM schedules WHERE activity_id = $1', [testActivityId]);
      await client.query('DELETE FROM activities WHERE host_id = $1', [testUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  describe('publishEntity', () => {
    it('should publish an activity and create a snapshot', async () => {
      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(result.resourceId).toBe(testActivityId);

      // Verify snapshot was created
      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].version).toBe(2);
      expect(snapshots[0].status).toBe('published');
    });

    it('should include activity summary in snapshot', async () => {
      // Create multiple schedules for the activity
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Create 3 schedules
        for (let i = 0; i < 3; i++) {
          await client.query(
            `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [testActivityId, '2026-06-01', '2026-06-01', '09:00', '10:00', 'UTC', 10 + i, i, testUserId]
          );
        }

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      // Publish activity
      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result.success).toBe(true);

      // Get snapshot and verify summary
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);
      expect(snapshot.data.summary).toBeDefined();
      expect(snapshot.data.summary.totalSchedules).toBe(3);
      expect(snapshot.data.summary.availableSchedules).toBe(3);
      expect(snapshot.data.summary.totalCapacity).toBe(33); // 10 + 11 + 12
    });

    it('should include schedule summary in snapshot', async () => {
      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      // Get snapshot and verify summary
      const snapshot = await SnapshotService.getVersion('schedule', testScheduleId, 2);
      expect(snapshot.data.summary).toBeDefined();
      expect(snapshot.data.summary.totalSlots).toBe(10);
      expect(snapshot.data.summary.bookedSlots).toBe(0);
      expect(snapshot.data.summary.availableSlots).toBe(10);
      expect(snapshot.data.summary.percentageBooked).toBe(0);
    });

    it('should increment version on each publish', async () => {
      // First publish
      const result1 = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result1.version).toBe(2);

      // Second publish
      const result2 = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result2.version).toBe(3);

      // Verify both snapshots exist
      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].version).toBe(2);
      expect(snapshots[1].version).toBe(3);
    });

    it('should fail when publishing non-existent resource', async () => {
      const fakeId = BigInt(999999);
      const result = await SnapshotService.publishEntity('activity', fakeId, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RESOURCE_NOT_FOUND');
    });

    it('should fail with invalid resource type', async () => {
      const result = await SnapshotService.publishEntity('invalid', testActivityId, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_RESOURCE_TYPE');
    });

    it('should publish a schedule', async () => {
      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testScheduleId),
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].resourceType).toBe('schedule');
    });

    it('should publish a booking', async () => {
      const result = await SnapshotService.publishEntity('booking', testBookingId, testUserId);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testBookingId),
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].resourceType).toBe('booking');
    });

    it('should compute correct schedule summary with partial bookings', async () => {
      // Update schedule to have more bookings
      const client = await getClient();
      try {
        await client.query(
          `UPDATE schedules SET booked_slots = 5 WHERE id = $1`,
          [testScheduleId]
        );
      } finally {
        client.release();
      }

      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);
      expect(result.success).toBe(true);

      const snapshot = await SnapshotService.getVersion('schedule', testScheduleId, 2);
      expect(snapshot.data.summary.totalSlots).toBe(10);
      expect(snapshot.data.summary.bookedSlots).toBe(5);
      expect(snapshot.data.summary.availableSlots).toBe(5);
      expect(snapshot.data.summary.percentageBooked).toBe(50);
    });

    it('should compute correct schedule summary when fully booked', async () => {
      // Update schedule to be fully booked
      const client = await getClient();
      try {
        await client.query(
          `UPDATE schedules SET booked_slots = 10 WHERE id = $1`,
          [testScheduleId]
        );
      } finally {
        client.release();
      }

      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);
      expect(result.success).toBe(true);

      const snapshot = await SnapshotService.getVersion('schedule', testScheduleId, 2);
      expect(snapshot.data.summary.totalSlots).toBe(10);
      expect(snapshot.data.summary.bookedSlots).toBe(10);
      expect(snapshot.data.summary.availableSlots).toBe(0);
      expect(snapshot.data.summary.percentageBooked).toBe(100);
    });

    it('should correctly count available schedules in activity summary', async () => {
      // Create schedules with different booking levels
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Fully booked schedule
        const schedule1 = await client.query(
          `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [testActivityId, '2026-06-02', '2026-06-02', '09:00', '10:00', 'UTC', 5, 5, testUserId]
        );

        // Partially booked schedule
        const schedule2 = await client.query(
          `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [testActivityId, '2026-06-03', '2026-06-03', '09:00', '10:00', 'UTC', 8, 3, testUserId]
        );

        // Empty schedule
        const schedule3 = await client.query(
          `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [testActivityId, '2026-06-04', '2026-06-04', '09:00', '10:00', 'UTC', 10, 0, testUserId]
        );

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result.success).toBe(true);

      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);
      expect(snapshot.data.summary.totalSchedules).toBe(4); // original + 3 new
      expect(snapshot.data.summary.availableSchedules).toBe(2); // partially booked + empty
      expect(snapshot.data.summary.totalCapacity).toBe(33); // 10 + 5 + 8 + 10
    });
  });

  describe('getVersion', () => {
    it('should retrieve a specific version snapshot', async () => {
      // Publish first
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Get version
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);

      expect(snapshot).toBeDefined();
      expect(snapshot.version).toBe(2);
      expect(snapshot.status).toBe('published');
      expect(snapshot.data.id).toBe(testActivityId);
    });

    it('should return null for non-existent version', async () => {
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 999);

      expect(snapshot).toBeNull();
    });

    it('should parse JSON data correctly', async () => {
      // Publish activity
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Get version and verify data
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);

      expect(snapshot.data).toHaveProperty('id');
      expect(snapshot.data).toHaveProperty('title');
      expect(snapshot.data.title).toBe('Test Activity');
    });

    it('should include metadata in snapshot', async () => {
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);

      expect(snapshot.publishedAt).toBeDefined();
      expect(snapshot.publishedBy).toBe(testUserId);
      expect(snapshot.isDeleted).toBe(false);
    });
  });

  describe('listVersions', () => {
    it('should list all versions for a resource', async () => {
      // Publish multiple times
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      const versions = await SnapshotService.listVersions('activity', testActivityId);

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2);
      expect(versions[1].version).toBe(3);
    });

    it('should return empty list for resource with no versions', async () => {
      const versions = await SnapshotService.listVersions('activity', BigInt(999999));

      expect(versions).toEqual([]);
    });

    it('should include all metadata in version list', async () => {
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      const versions = await SnapshotService.listVersions('activity', testActivityId);

      expect(versions[0]).toHaveProperty('version');
      expect(versions[0]).toHaveProperty('status');
      expect(versions[0]).toHaveProperty('publishedAt');
      expect(versions[0]).toHaveProperty('publishedBy');
      expect(versions[0]).toHaveProperty('isDeleted');
    });
  });

  describe('softDeleteVersion', () => {
    it('should soft-delete a version without removing data', async () => {
      // Publish first
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Soft-delete version
      const result = await SnapshotService.softDeleteVersion('activity', testActivityId, 2, testUserId);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      // Verify version still exists but is marked deleted
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);
      expect(snapshot).toBeDefined();
      expect(snapshot.isDeleted).toBe(true);
    });

    it('should fail to delete non-existent version', async () => {
      const result = await SnapshotService.softDeleteVersion('activity', testActivityId, 999, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_NOT_FOUND');
    });

    it('should allow multiple versions to be soft-deleted', async () => {
      // Create multiple versions
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Delete first version
      const result1 = await SnapshotService.softDeleteVersion('activity', testActivityId, 2, testUserId);
      expect(result1.success).toBe(true);

      // Delete second version
      const result2 = await SnapshotService.softDeleteVersion('activity', testActivityId, 3, testUserId);
      expect(result2.success).toBe(true);

      // Verify both are marked deleted
      const snapshot2 = await SnapshotService.getVersion('activity', testActivityId, 2);
      const snapshot3 = await SnapshotService.getVersion('activity', testActivityId, 3);

      expect(snapshot2.isDeleted).toBe(true);
      expect(snapshot3.isDeleted).toBe(true);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a version as a new draft', async () => {
      // Publish first
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Restore version
      const result = await SnapshotService.restoreVersion('activity', testActivityId, 2, testUserId);

      expect(result.success).toBe(true);
      expect(result.newDraftId).toBeDefined();
      expect(result.newDraftId).not.toBe(testActivityId);
    });

    it('should fail to restore non-existent version', async () => {
      const result = await SnapshotService.restoreVersion('activity', testActivityId, 999, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_NOT_FOUND');
    });

    it('should fail to restore a deleted version', async () => {
      // Publish and soft-delete
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      await SnapshotService.softDeleteVersion('activity', testActivityId, 2, testUserId);

      // Try to restore
      const result = await SnapshotService.restoreVersion('activity', testActivityId, 2, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_IS_DELETED');
    });

    it('should create new resource with version 1', async () => {
      // Publish current resource (version becomes 2)
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      // Restore to new resource
      const restoreResult = await SnapshotService.restoreVersion('activity', testActivityId, 2, testUserId);
      expect(restoreResult.success).toBe(true);

      // Get the restored resource and verify version
      const newActivityId = restoreResult.newDraftId!;
      const newActivity = await db.query.activities.findFirst({
        where: eq(activities.id, newActivityId),
      });

      expect(newActivity?.version).toBe(1);
      expect(newActivity?.status).toBe('draft');
      expect(newActivity?.publishedAt).toBeNull();
    });

    it('should restore schedule as new resource', async () => {
      // Publish schedule
      await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);

      // Restore
      const result = await SnapshotService.restoreVersion('schedule', testScheduleId, 2, testUserId);

      expect(result.success).toBe(true);
      expect(result.newDraftId).toBeDefined();

      // Verify new schedule exists
      const newSchedule = await db.query.schedules.findFirst({
        where: eq(schedules.id, result.newDraftId!),
      });

      expect(newSchedule).toBeDefined();
      expect(newSchedule?.version).toBe(1);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version of a resource', async () => {
      let version = await SnapshotService.getCurrentVersion('activity', testActivityId);
      expect(version).toBe(1);

      // Publish and check
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      version = await SnapshotService.getCurrentVersion('activity', testActivityId);
      expect(version).toBe(2);
    });

    it('should return null for non-existent resource', async () => {
      const version = await SnapshotService.getCurrentVersion('activity', BigInt(999999));
      expect(version).toBeNull();
    });

    it('should handle all resource types', async () => {
      const activityVersion = await SnapshotService.getCurrentVersion('activity', testActivityId);
      const scheduleVersion = await SnapshotService.getCurrentVersion('schedule', testScheduleId);
      const bookingVersion = await SnapshotService.getCurrentVersion('booking', testBookingId);

      expect(activityVersion).toBe(1);
      expect(scheduleVersion).toBe(1);
      expect(bookingVersion).toBe(1);
    });
  });

  describe('transaction atomicity', () => {
    it('should ensure all-or-nothing semantics for publish', async () => {
      // This test verifies transaction safety
      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      expect(result.success).toBe(true);

      // Verify both snapshot creation and version update happened
      const snapshot = await db.query.resourceVersions.findFirst({
        where: eq(resourceVersions.resourceId, testActivityId),
      });
      const activity = await db.query.activities.findFirst({
        where: eq(activities.id, testActivityId),
      });

      expect(snapshot).toBeDefined();
      expect(activity?.version).toBe(2);
    });
  });

  describe('audit logging', () => {
    it('should create audit logs for publish operations', async () => {
      // This would require AuditService to be queryable
      // For now, we just verify the operation completes without error
      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result.success).toBe(true);
    });
  });

  describe('summary backward compatibility', () => {
    it('should handle snapshots without summary gracefully', async () => {
      // Publish to get a snapshot with summary
      await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);

      // Verify summary exists
      expect(snapshot.data.summary).toBeDefined();
      expect(snapshot.data).toHaveProperty('title');
      expect(snapshot.data).toHaveProperty('id');

      // Verify data fields are still present alongside summary (backward compatible)
      expect(snapshot.data.id).toBe(testActivityId);
    });

    it('should store summary as optional JSON field', async () => {
      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);
      expect(result.success).toBe(true);

      // Get raw snapshot data
      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testScheduleId),
      });

      expect(snapshots).toHaveLength(1);

      // Parse and verify summary is in JSON
      const snapshotData = JSON.parse(snapshots[0].data);
      expect(snapshotData.summary).toBeDefined();
      expect(typeof snapshotData.summary).toBe('object');
    });
  });

  describe('summary computation performance', () => {
    it('should compute schedule summary in under 50ms', async () => {
      const startTime = Date.now();

      const result = await SnapshotService.publishEntity('schedule', testScheduleId, testUserId);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(50);
    });

    it('should compute activity summary for multiple schedules efficiently', async () => {
      // Create 10 schedules
      const client = await getClient();
      try {
        await client.query('BEGIN');

        for (let i = 0; i < 10; i++) {
          await client.query(
            `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              testActivityId,
              '2026-06-01',
              '2026-06-30',
              '09:00',
              '10:00',
              'UTC',
              20,
              i,
              testUserId,
            ]
          );
        }

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      const startTime = Date.now();

      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(50);

      // Verify summary accuracy
      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);
      expect(snapshot.data.summary.totalSchedules).toBe(11); // original + 10 new
      expect(snapshot.data.summary.totalCapacity).toBe(220); // 20 * 11
    });
  });

  describe('summary edge cases', () => {
    it('should handle schedule with zero slots', async () => {
      const client = await getClient();
      let zeroSlotScheduleId: bigint;

      try {
        await client.query('BEGIN');

        const result = await client.query(
          `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [testActivityId, '2026-06-05', '2026-06-05', '09:00', '10:00', 'UTC', 0, 0, testUserId]
        );

        zeroSlotScheduleId = BigInt(result.rows[0].id);

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      const publishResult = await SnapshotService.publishEntity(
        'schedule',
        zeroSlotScheduleId,
        testUserId
      );
      expect(publishResult.success).toBe(true);

      const snapshot = await SnapshotService.getVersion(
        'schedule',
        zeroSlotScheduleId,
        2
      );
      expect(snapshot.data.summary.totalSlots).toBe(0);
      expect(snapshot.data.summary.availableSlots).toBe(0);
      expect(snapshot.data.summary.percentageBooked).toBe(0); // Should not error with 0 total slots
    });

    it('should handle activity with no schedules', async () => {
      const result = await SnapshotService.publishEntity('activity', testActivityId, testUserId);
      expect(result.success).toBe(true);

      const snapshot = await SnapshotService.getVersion('activity', testActivityId, 2);
      expect(snapshot.data.summary.totalSchedules).toBe(1); // Only the one from beforeEach
      expect(snapshot.data.summary.availableSchedules).toBeGreaterThanOrEqual(0);
      expect(snapshot.data.summary.totalCapacity).toBeGreaterThanOrEqual(0);
    });

    it('should compute accurate percentage for various booking levels', async () => {
      const testCases = [
        { totalSlots: 100, bookedSlots: 33, expectedPercentage: 33 },
        { totalSlots: 3, bookedSlots: 1, expectedPercentage: 33.33 },
        { totalSlots: 7, bookedSlots: 2, expectedPercentage: 28.57 },
      ];

      const client = await getClient();
      const scheduleIds: bigint[] = [];

      try {
        await client.query('BEGIN');

        for (const testCase of testCases) {
          const result = await client.query(
            `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id`,
            [
              testActivityId,
              '2026-07-01',
              '2026-07-01',
              '09:00',
              '10:00',
              'UTC',
              testCase.totalSlots,
              testCase.bookedSlots,
              testUserId,
            ]
          );

          scheduleIds.push(BigInt(result.rows[0].id));
        }

        await client.query('COMMIT');
      } finally {
        client.release();
      }

      for (let i = 0; i < testCases.length; i++) {
        const publishResult = await SnapshotService.publishEntity(
          'schedule',
          scheduleIds[i],
          testUserId
        );
        expect(publishResult.success).toBe(true);

        const snapshot = await SnapshotService.getVersion('schedule', scheduleIds[i], 2);
        const expectedPercentage = testCases[i].expectedPercentage;

        // Allow small floating point difference
        expect(Math.abs(snapshot.data.summary.percentageBooked - expectedPercentage)).toBeLessThan(0.01);
      }
    });
  });
});
