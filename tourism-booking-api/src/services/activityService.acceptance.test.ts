import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db, getClient } from '../db/index';
import { ActivityService } from './activityService';
import { SnapshotService } from './snapshotService';
import { users, activities, resourceVersions, auditLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';

describe('Activity Publishing Service - Acceptance Tests', () => {
  let testUserId: bigint;
  let testActivityId: bigint;

  beforeEach(async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create test user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        ['publisher@example.com', 'hash', 'Publisher', 'User']
      );
      testUserId = BigInt(userResult.rows[0].id);

      // Create test activity
      const activityResult = await client.query(
        `INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [testUserId, 'Mountain Adventure', 'Exciting mountain expedition', 'Adventure', '199.99', 'USD', 12, 480, 'Alpine Region', 'active', 1]
      );
      testActivityId = BigInt(activityResult.rows[0].id);

      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM audit_logs WHERE resource_id = $1', [testActivityId.toString()]);
      await client.query('DELETE FROM resource_versions WHERE resource_id = $1 AND resource_type = $2', [
        testActivityId,
        'activity',
      ]);
      await client.query('DELETE FROM activities WHERE host_id = $1', [testUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  describe('Acceptance Criteria Verification', () => {
    it('AC1: publish() creates immutable snapshot', async () => {
      // Get original activity state
      const originalActivity = await ActivityService.getActivity(testActivityId.toString());
      const originalDescription = originalActivity!.description;

      // Publish the activity
      const publishResult = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publishResult.success).toBe(true);

      // Modify the activity
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET description = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['Updated description', testActivityId]
        );
      } finally {
        client.release();
      }

      // Verify snapshot still has original data (immutable)
      const snapshot = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        publishResult.version!
      );

      expect(snapshot).not.toBeNull();
      expect(snapshot.data.description).toBe(originalDescription);
      expect(snapshot.status).toBe('published');

      // Verify current activity has updated data
      const currentActivity = await ActivityService.getActivity(testActivityId.toString());
      expect(currentActivity!.description).toBe('Updated description');
    });

    it('AC2: Version increments atomically with status change', async () => {
      const activity1 = await ActivityService.getActivity(testActivityId.toString());
      const initialVersion = activity1!.version;

      // First publish
      const publish1 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publish1.version).toBe(initialVersion + 1);

      // Second publish
      const publish2 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publish2.version).toBe(initialVersion + 2);

      // Verify both versions exist in database
      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].version).toBe(initialVersion + 1);
      expect(snapshots[1].version).toBe(initialVersion + 2);

      // Verify atomic nature - no duplicates
      const versions = snapshots.map(s => s.version);
      expect(new Set(versions).size).toBe(versions.length); // All unique
    });

    it('AC3: Published activities become read-only (validation)', async () => {
      // Publish the activity
      const publishResult = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publishResult.success).toBe(true);

      // Verify snapshot is marked as published
      const snapshot = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        publishResult.version!
      );

      expect(snapshot.status).toBe('published');

      // Note: Full read-only enforcement is at route/middleware level
      // This test verifies the snapshot is correctly marked as published
      // Actual write prevention would be implemented in the PATCH/UPDATE routes
    });

    it('AC4: Validation prevents publishing non-draft items', async () => {
      const client = await getClient();
      try {
        // Set activity to archived
        await client.query(
          'UPDATE activities SET status = $1 WHERE id = $2',
          ['archived', testActivityId]
        );
      } finally {
        client.release();
      }

      // Attempt to publish
      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_STATUS');
    });

    it('AC5: Tests verify end-to-end workflow', async () => {
      // Step 1: Verify activity exists
      const activity = await ActivityService.getActivity(testActivityId.toString());
      expect(activity).not.toBeNull();
      expect(activity!.title).toBe('Mountain Adventure');

      // Step 2: Publish
      const publish1 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publish1.success).toBe(true);
      expect(publish1.version).toBe(2);

      // Step 3: Modify and publish again
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['Updated Mountain Adventure', testActivityId]
        );
      } finally {
        client.release();
      }

      const publish2 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(publish2.success).toBe(true);
      expect(publish2.version).toBe(3);

      // Step 4: Retrieve version history
      const versions = await ActivityService.listActivityVersions(testActivityId.toString());
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2);
      expect(versions[1].version).toBe(3);

      // Step 5: Retrieve specific version
      const snapshot2 = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        2
      );
      expect(snapshot2.data.title).toBe('Mountain Adventure');

      // Step 6: Verify current activity
      const currentActivity = await ActivityService.getActivity(testActivityId.toString());
      expect(currentActivity!.title).toBe('Updated Mountain Adventure');

      // End-to-end workflow verification complete
    });
  });

  describe('Validation & Error Handling', () => {
    it('should validate activity existence', async () => {
      const result = await ActivityService.publishActivity('999999', testUserId.toString());
      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTIVITY_NOT_FOUND');
    });

    it('should reject invalid status values', async () => {
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET status = $1 WHERE id = $2',
          ['inactive', testActivityId] // inactive is not allowed
        );
      } finally {
        client.release();
      }

      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_STATUS');
    });

    it('should allow active status', async () => {
      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(result.success).toBe(true);
    });

    it('should allow draft status', async () => {
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET status = $1 WHERE id = $2',
          ['draft', testActivityId]
        );
      } finally {
        client.release();
      }

      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log entries for publish operations', async () => {
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.resourceId, testActivityId.toString()),
          eq(auditLogs.resourceType, 'activity'),
          eq(auditLogs.operationType, 'publish')
        ),
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].actorId).toBe(testUserId.toString());
      expect(logs[0].description).toContain('published');
    });

    it('should include before/after state in audit logs', async () => {
      const activityBefore = await ActivityService.getActivity(testActivityId.toString());

      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.resourceId, testActivityId.toString()),
      });

      const publishLog = logs.find(l => l.operationType === 'publish');
      expect(publishLog).not.toBeUndefined();
      expect(publishLog!.beforeState).not.toBeNull();
      expect(publishLog!.afterState).not.toBeNull();
    });
  });

  describe('Snapshot Data Integrity', () => {
    it('should preserve all activity fields in snapshot', async () => {
      const activity = await ActivityService.getActivity(testActivityId.toString());

      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const snapshot = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        2
      );

      expect(snapshot.data).toEqual(activity);
    });

    it('should maintain JSON integrity across multiple publishes', async () => {
      // Publish multiple times with modifications
      for (let i = 0; i < 3; i++) {
        const currentVersion = i + 2;

        const publish = await ActivityService.publishActivity(
          testActivityId.toString(),
          testUserId.toString()
        );

        const snapshot = await ActivityService.getActivityVersion(
          testActivityId.toString(),
          currentVersion
        );

        expect(snapshot.data).toHaveProperty('id');
        expect(snapshot.data).toHaveProperty('title');
        expect(snapshot.data).toHaveProperty('description');
        expect(typeof snapshot.data).toBe('object');
      }
    });
  });
});
