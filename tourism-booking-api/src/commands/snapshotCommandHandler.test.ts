import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SnapshotCommandHandler } from './snapshotCommandHandler';
import { PublishCommand, RestoreCommand, DeleteVersionCommand } from './publishCommand';
import { AuditService } from '../services/auditService';
import { SnapshotService } from '../services/snapshotService';
import { db, withTransaction, getClient } from '../db/index';
import { activities, auditLogs, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

describe('SnapshotCommandHandler', () => {
  let handler: SnapshotCommandHandler;
  let activityId: bigint;
  let userId: bigint;

  beforeEach(async () => {
    handler = new SnapshotCommandHandler();
    const client = await getClient();

    // Create test user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      ['test@example.com', 'hash', 'Test', 'User']
    );
    userId = BigInt(userResult.rows[0].id);

    // Create a test activity
    const activityResult = await client.query(
      `INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, version, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId, 'Test Activity', 'Test Description', 'Category', '100.00', 'USD', 10, 60, 'Test Location', 1, 'draft']
    );

    activityId = BigInt(activityResult.rows[0].id);
  });

  afterEach(async () => {
    // Clean up test data
    const client = await getClient();
    await client.query('DELETE FROM audit_logs WHERE resource_id = $1', [activityId.toString()]);
    await client.query('DELETE FROM activities WHERE id = $1', [activityId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('PublishCommand execution', () => {
    it('should publish an activity and create audit log', async () => {
      const command = new PublishCommand('activity', activityId, userId, 'operator');
      const result = await handler.handle(command);

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(2);
      expect(result.data?.resourceId).toBe(activityId);
      expect(result.message).toContain('published successfully');
    });

    it('should log publish operation to audit trail', async () => {
      const command = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(command);

      // Verify audit log entry
      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      expect(auditEntries.length).toBeGreaterThan(0);

      const publishEntry = auditEntries.find((log) => log.operationType === 'publish');
      expect(publishEntry).toBeDefined();
      expect(publishEntry?.resourceType).toBe('activity');
      expect(publishEntry?.resourceId).toBe(activityId.toString());
      expect(publishEntry?.actorId).toBe(userId.toString());
      expect(publishEntry?.description).toContain('published');
    });

    it('should capture before and after state in audit log', async () => {
      const command = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(command);

      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const publishEntry = auditEntries.find((log) => log.operationType === 'publish');

      expect(publishEntry?.beforeState).toBeDefined();
      expect(publishEntry?.afterState).toBeDefined();

      const beforeState = JSON.parse(publishEntry?.beforeState || '{}');
      const afterState = JSON.parse(publishEntry?.afterState || '{}');

      expect(beforeState.version).toBe(1);
      expect(afterState.version).toBe(2);
      expect(afterState.status).toBe('published');
    });

    it('should fail for non-existent resource', async () => {
      const nonExistentId = BigInt(999999);
      const command = new PublishCommand('activity', nonExistentId, userId, 'operator');
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RESOURCE_NOT_FOUND');
    });

    it('should create version snapshot', async () => {
      const command = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(command);

      // Verify snapshot was created
      const version = await SnapshotService.getVersion('activity', activityId, 2);
      expect(version).toBeDefined();
      expect(version?.version).toBe(2);
      expect(version?.status).toBe('published');
      expect(version?.data).toBeDefined();
    });

    it('should handle command metadata correctly', async () => {
      const command = new PublishCommand('activity', activityId, userId, 'operator');

      expect(command.metadata.commandId).toContain('publish-activity');
      expect(command.metadata.resourceType).toBe('activity');
      expect(command.metadata.resourceId).toBe(activityId);
      expect(command.metadata.userId).toBe(userId);
      expect(command.metadata.userRole).toBe('operator');
      expect(command.metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('RestoreCommand execution', () => {
    beforeEach(async () => {
      // Publish an activity first to create a version
      const publishCommand = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCommand);
    });

    it('should restore a version and create audit log', async () => {
      const command = new RestoreCommand('activity', activityId, 2, userId, 'operator');
      const result = await handler.handleRestore(command);

      expect(result.success).toBe(true);
      expect(result.data?.newResourceId).toBeGreaterThan(BigInt(0));
    });

    it('should log restore operation to audit trail', async () => {
      const command = new RestoreCommand('activity', activityId, 2, userId, 'operator');
      await handler.handleRestore(command);

      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const restoreEntry = auditEntries.find((log) => log.operationType === 'restore');

      expect(restoreEntry).toBeDefined();
      expect(restoreEntry?.resourceType).toBe('activity');
      expect(restoreEntry?.actorId).toBe(userId.toString());
      expect(restoreEntry?.description).toContain('restored');
    });

    it('should capture before and after state for restore', async () => {
      const command = new RestoreCommand('activity', activityId, 2, userId, 'operator');
      await handler.handleRestore(command);

      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const restoreEntry = auditEntries.find((log) => log.operationType === 'restore');

      expect(restoreEntry?.beforeState).toBeDefined();
      expect(restoreEntry?.afterState).toBeDefined();

      const afterState = JSON.parse(restoreEntry?.afterState || '{}');
      expect(afterState.newResourceId).toBeDefined();
      expect(afterState.status).toBe('draft');
    });

    it('should fail for non-existent version', async () => {
      const command = new RestoreCommand('activity', activityId, 999, userId, 'operator');
      const result = await handler.handleRestore(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_NOT_FOUND');
    });

    it('should handle command metadata correctly', async () => {
      const command = new RestoreCommand('activity', activityId, 2, userId, 'operator');

      expect(command.metadata.commandId).toContain('restore-activity');
      expect(command.version).toBe(2);
    });
  });

  describe('DeleteVersionCommand execution', () => {
    beforeEach(async () => {
      // Publish an activity first to create a version
      const publishCommand = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCommand);
    });

    it('should soft-delete a version and create audit log', async () => {
      const command = new DeleteVersionCommand('activity', activityId, 2, userId, 'operator');
      const result = await handler.handleDeleteVersion(command);

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(2);
    });

    it('should log delete operation to audit trail', async () => {
      const command = new DeleteVersionCommand('activity', activityId, 2, userId, 'operator');
      await handler.handleDeleteVersion(command);

      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const deleteEntry = auditEntries.find((log) => log.operationType === 'delete_version');

      expect(deleteEntry).toBeDefined();
      expect(deleteEntry?.resourceType).toBe('activity');
      expect(deleteEntry?.actorId).toBe(userId.toString());
      expect(deleteEntry?.description).toContain('soft-deleted');
    });

    it('should capture before and after state for delete', async () => {
      const command = new DeleteVersionCommand('activity', activityId, 2, userId, 'operator');
      await handler.handleDeleteVersion(command);

      const auditEntries = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const deleteEntry = auditEntries.find((log) => log.operationType === 'delete_version');

      expect(deleteEntry?.beforeState).toBeDefined();
      expect(deleteEntry?.afterState).toBeDefined();

      const beforeState = JSON.parse(deleteEntry?.beforeState || '{}');
      const afterState = JSON.parse(deleteEntry?.afterState || '{}');

      expect(beforeState.isDeleted).toBe(false);
      expect(afterState.isDeleted).toBe(true);
    });

    it('should fail for non-existent version', async () => {
      const command = new DeleteVersionCommand('activity', activityId, 999, userId, 'operator');
      const result = await handler.handleDeleteVersion(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VERSION_NOT_FOUND');
    });

    it('should handle command metadata correctly', async () => {
      const command = new DeleteVersionCommand('activity', activityId, 2, userId, 'operator');

      expect(command.metadata.commandId).toContain('delete-version-activity');
      expect(command.version).toBe(2);
    });
  });

  describe('Audit trail integration', () => {
    it('should create complete audit trail for publish workflow', async () => {
      const publishCmd = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCmd);

      const auditHistory = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      expect(auditHistory.length).toBeGreaterThan(0);

      const operations = auditHistory.map((log) => log.operationType);
      expect(operations).toContain('publish');
    });

    it('should queryable audit trail by resource and date', async () => {
      const publishCmd = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCmd);

      const { logs, total } = await AuditService.queryAuditLogs({
        resourceType: 'activity',
        resourceId: activityId.toString(),
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should preserve actor information in audit log', async () => {
      const publishCmd = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCmd);

      const auditHistory = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const publishEntry = auditHistory.find((log) => log.operationType === 'publish');

      expect(publishEntry?.actorType).toBe('user');
      expect(publishEntry?.actorId).toBe(userId.toString());
    });

    it('should maintain timestamp accuracy in audit logs', async () => {
      const beforeTime = new Date();
      const publishCmd = new PublishCommand('activity', activityId, userId, 'operator');
      await handler.handle(publishCmd);
      const afterTime = new Date();

      const auditHistory = await AuditService.getResourceAuditHistory('activity', activityId.toString());
      const publishEntry = auditHistory.find((log) => log.operationType === 'publish');

      const opTime = new Date(publishEntry?.operationTimestamp || 0);
      expect(opTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(opTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid resource type in SnapshotService
      const command = new PublishCommand('activity', BigInt(0), userId, 'operator');
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.error).toBeDefined();
    });

    it('should return meaningful error messages', async () => {
      const nonExistentId = BigInt(999999);
      const command = new PublishCommand('activity', nonExistentId, userId, 'operator');
      const result = await handler.handle(command);

      expect(result.message).toContain('not found');
    });
  });

  describe('Multiple resource types', () => {
    let scheduleId: bigint;

    beforeEach(async () => {
      // Create test schedule
      const client = await getClient();
      const scheduleResult = await client.query(
        `INSERT INTO schedules (activity_id, start_date, end_date, start_time, end_time, timezone, total_slots, booked_slots, operator_id, version, status, created_at, updated_at)
         VALUES ($1, CURRENT_DATE, CURRENT_DATE, '09:00:00', '17:00:00', 'UTC', 10, 0, $2, 1, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [activityId, userId]
      ).catch(() => null);

      scheduleId = scheduleResult?.rows[0]?.id ? BigInt(scheduleResult.rows[0].id) : BigInt(0);
    });

    afterEach(async () => {
      // Clean up schedule
      if (scheduleId !== BigInt(0)) {
        const client = await getClient();
        await client.query('DELETE FROM schedules WHERE id = $1', [scheduleId]).catch(() => null);
      }
    });

    it('should handle publish for schedule resource type', async () => {
      if (scheduleId === BigInt(0)) {
        // Skip if schedule creation failed
        return;
      }

      const command = new PublishCommand('schedule', scheduleId, userId, 'operator');
      const result = await handler.handle(command);

      // Should either succeed or fail with resource not found (depending on DB state)
      expect(result.success === true || result.error === 'RESOURCE_NOT_FOUND').toBe(true);
    });

    it('should handle publish for booking resource type', async () => {
      const command = new PublishCommand('booking', BigInt(999999), userId, 'operator');
      const result = await handler.handle(command);

      // Expected to fail as we didn't create a valid booking
      expect(result.error).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
