import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db, getClient } from '../db/index';
import { ActivityService } from './activityService';
import { SnapshotService } from './snapshotService';
import { users, activities, resourceVersions } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('ActivityService - Publish Workflow', () => {
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
        ['test@example.com', 'hash', 'Test', 'User']
      );
      testUserId = BigInt(userResult.rows[0].id);

      // Create test activity with draft status
      const activityResult = await client.query(
        `INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, version, status`,
        [testUserId, 'Test Activity', 'Test Description', 'Adventure', '99.99', 'USD', 10, 60, 'Test Location', 'active']
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

  describe('publishActivity', () => {
    it('should publish an activity successfully', async () => {
      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Activity published successfully');
      expect(result.version).toBe(2);
      expect(result.activityId).toBe(testActivityId);
    });

    it('should create an immutable snapshot when publishing', async () => {
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].version).toBe(2);
      expect(snapshots[0].status).toBe('published');
      expect(snapshots[0].resourceType).toBe('activity');
      expect(snapshots[0].publishedBy).toBe(testUserId);
      expect(snapshots[0].publishedAt).not.toBeNull();
    });

    it('should increment version atomically', async () => {
      // First publish
      const result1 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(result1.version).toBe(2);

      // Second publish
      const result2 = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      expect(result2.version).toBe(3);

      // Verify both snapshots exist with correct versions
      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].version).toBe(2);
      expect(snapshots[1].version).toBe(3);
    });

    it('should fail when publishing non-existent activity', async () => {
      const fakeActivityId = '999999';
      const result = await ActivityService.publishActivity(fakeActivityId, testUserId.toString());

      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTIVITY_NOT_FOUND');
      expect(result.message).toBe('Activity not found');
    });

    it('should fail when publishing archived activity', async () => {
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

      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_STATUS');
    });

    it('should store complete activity snapshot data', async () => {
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const snapshot = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        2
      );

      expect(snapshot).not.toBeNull();
      expect(snapshot.version).toBe(2);
      expect(snapshot.status).toBe('published');
      expect(snapshot.data).toHaveProperty('title');
      expect(snapshot.data).toHaveProperty('description');
      expect(snapshot.data).toHaveProperty('category');
      expect(snapshot.data.title).toBe('Test Activity');
    });

    it('should list all versions of an activity', async () => {
      // Publish twice
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const versions = await ActivityService.listActivityVersions(
        testActivityId.toString()
      );

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2);
      expect(versions[1].version).toBe(3);
      expect(versions[0].status).toBe('published');
      expect(versions[1].status).toBe('published');
      expect(versions[0].publishedAt).not.toBeNull();
      expect(versions[1].publishedAt).not.toBeNull();
    });

    it('should allow publishing active status activity', async () => {
      const result = await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      expect(result.success).toBe(true);
    });

    it('should set publishedBy and publishedAt fields', async () => {
      const beforePublish = new Date();

      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      const afterPublish = new Date();

      const snapshots = await db.query.resourceVersions.findMany({
        where: eq(resourceVersions.resourceId, testActivityId),
      });

      expect(snapshots[0].publishedBy).toBe(testUserId);
      expect(snapshots[0].publishedAt).not.toBeNull();
      expect(snapshots[0].publishedAt!.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      expect(snapshots[0].publishedAt!.getTime()).toBeLessThanOrEqual(afterPublish.getTime());
    });
  });

  describe('getActivity', () => {
    it('should fetch activity from database', async () => {
      const activity = await ActivityService.getActivity(testActivityId.toString());

      expect(activity).not.toBeNull();
      expect(activity!.id).toBe(testActivityId);
      expect(activity!.title).toBe('Test Activity');
      expect(activity!.hostId).toBe(testUserId);
    });

    it('should return null for non-existent activity', async () => {
      const activity = await ActivityService.getActivity('999999');
      expect(activity).toBeNull();
    });
  });

  describe('integration: publish with activity state', () => {
    it('should maintain referential integrity in snapshots', async () => {
      // Publish activity
      await ActivityService.publishActivity(
        testActivityId.toString(),
        testUserId.toString()
      );

      // Modify the activity in database
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET title = $1 WHERE id = $2',
          ['Updated Title', testActivityId]
        );
      } finally {
        client.release();
      }

      // Verify snapshot still has original data
      const snapshot = await ActivityService.getActivityVersion(
        testActivityId.toString(),
        2
      );

      expect(snapshot.data.title).toBe('Test Activity');
    });

    it('should support multiple publishes of same activity', async () => {
      const publishResults = [];
      for (let i = 0; i < 3; i++) {
        const result = await ActivityService.publishActivity(
          testActivityId.toString(),
          testUserId.toString()
        );
        publishResults.push(result);
      }

      expect(publishResults[0].version).toBe(2);
      expect(publishResults[1].version).toBe(3);
      expect(publishResults[2].version).toBe(4);

      // Verify all versions are in database
      const versions = await ActivityService.listActivityVersions(
        testActivityId.toString()
      );
      expect(versions).toHaveLength(3);
    });
  });
});
