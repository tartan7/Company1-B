import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { db } from '../db/index';
import { users, organizations, userPleasanterMappings, roles, userRoles, syncReconciliationLogs, } from '../db/schema';
import { eq } from 'drizzle-orm';
import { PleasanterUserSyncService } from './pleasanterSyncService';
describe('PleasanterUserSyncService', () => {
    let orgId;
    beforeEach(async () => {
        // Create test organization
        const org = await db
            .insert(organizations)
            .values({
            name: 'Test Org',
            pleasanterId: BigInt(1),
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        orgId = org[0].id;
    });
    afterEach(async () => {
        // Cleanup
        await db.delete(userRoles);
        await db.delete(syncReconciliationLogs);
        await db.delete(userPleasanterMappings);
        await db.delete(roles);
        await db.delete(users);
        await db.delete(organizations);
    });
    describe('syncUsers', () => {
        it('should create new users from Pleasanter', async () => {
            const pleasanterUsers = [
                {
                    id: BigInt(101),
                    email: 'user1@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    roles: ['admin', 'user'],
                    lastModified: new Date(),
                },
                {
                    id: BigInt(102),
                    email: 'user2@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    roles: ['user'],
                    lastModified: new Date(),
                },
            ];
            const result = await PleasanterUserSyncService.syncUsers(orgId, pleasanterUsers, false);
            assert.strictEqual(result.usersCreated, 2);
            assert.strictEqual(result.usersUpdated, 0);
            assert.strictEqual(result.conflictsDetected, 0);
            // Verify users were created
            const createdUsers = await db
                .select()
                .from(users)
                .where(eq(users.email, 'user1@example.com'));
            assert.strictEqual(createdUsers.length, 1);
            // Verify mappings were created
            const mappings = await db
                .select()
                .from(userPleasanterMappings)
                .where(eq(userPleasanterMappings.pleasanterUserId, BigInt(101)));
            assert.strictEqual(mappings.length, 1);
        });
        it('should handle dry-run mode', async () => {
            const pleasanterUsers = [
                {
                    id: BigInt(103),
                    email: 'user3@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                    roles: ['user'],
                    lastModified: new Date(),
                },
            ];
            const result = await PleasanterUserSyncService.syncUsers(orgId, pleasanterUsers, true);
            assert.strictEqual(result.usersCreated, 0); // Dry run doesn't count as created
            // Verify no users were actually created
            const createdUsers = await db
                .select()
                .from(users)
                .where(eq(users.email, 'user3@example.com'));
            assert.strictEqual(createdUsers.length, 0);
        });
        it('should detect email collisions', async () => {
            // Create existing user
            const existingUser = await db
                .insert(users)
                .values({
                email: 'existing@example.com',
                firstName: 'Existing',
                lastName: 'User',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            const pleasanterUsers = [
                {
                    id: BigInt(104),
                    email: 'existing@example.com',
                    firstName: 'Different',
                    lastName: 'User',
                    roles: ['user'],
                    lastModified: new Date(),
                },
            ];
            const result = await PleasanterUserSyncService.syncUsers(orgId, pleasanterUsers, false);
            assert.strictEqual(result.conflictsDetected, 1);
            assert.strictEqual(result.conflicts[0].type, 'email_collision');
        });
        it('should update existing user roles', async () => {
            // Create user and initial mapping
            const user = await db
                .insert(users)
                .values({
                email: 'update-test@example.com',
                firstName: 'Update',
                lastName: 'Test',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await db.insert(userPleasanterMappings).values({
                pleasanterUserId: BigInt(105),
                localUserId: user[0].id,
                organizationId: orgId,
                lastSyncAt: new Date(Date.now() - 3600000),
                lastKnownRoles: JSON.stringify(['user']),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            // Sync with updated roles
            const pleasanterUsers = [
                {
                    id: BigInt(105),
                    email: 'update-test@example.com',
                    firstName: 'Update',
                    lastName: 'Test',
                    roles: ['admin', 'editor', 'user'],
                    lastModified: new Date(),
                },
            ];
            const result = await PleasanterUserSyncService.syncUsers(orgId, pleasanterUsers, false);
            assert.strictEqual(result.usersUpdated, 1);
            // Verify roles were updated
            const userRoleRecords = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, user[0].id));
            assert.strictEqual(userRoleRecords.length, 3);
        });
        it('should detect stale mappings', async () => {
            // Create a stale mapping
            const user = await db
                .insert(users)
                .values({
                email: 'stale@example.com',
                firstName: 'Stale',
                lastName: 'User',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await db.insert(userPleasanterMappings).values({
                pleasanterUserId: BigInt(999),
                localUserId: user[0].id,
                organizationId: orgId,
                lastSyncAt: new Date(),
                lastKnownRoles: JSON.stringify(['user']),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            // Sync without the user (it's deleted in Pleasanter)
            const pleasanterUsers = [];
            const result = await PleasanterUserSyncService.syncUsers(orgId, pleasanterUsers, false);
            assert.strictEqual(result.staleMappingsDetected, 1);
            assert.strictEqual(result.conflictsDetected, 1);
            // Verify mapping was marked as stale
            const mapping = await db
                .select()
                .from(userPleasanterMappings)
                .where(eq(userPleasanterMappings.pleasanterUserId, BigInt(999)));
            assert.strictEqual(mapping[0].syncStatus, 'stale');
        });
    });
    describe('getSyncStatus', () => {
        it('should return correct sync status counts', async () => {
            // Create test users and mappings
            const user1 = await db
                .insert(users)
                .values({
                email: 'status1@example.com',
                firstName: 'Status',
                lastName: 'Test1',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            const user2 = await db
                .insert(users)
                .values({
                email: 'status2@example.com',
                firstName: 'Status',
                lastName: 'Test2',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            const now = new Date();
            await db.insert(userPleasanterMappings).values([
                {
                    pleasanterUserId: BigInt(201),
                    localUserId: user1[0].id,
                    organizationId: orgId,
                    lastSyncAt: now,
                    lastKnownRoles: JSON.stringify(['admin']),
                    syncStatus: 'synced',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    pleasanterUserId: BigInt(202),
                    localUserId: user2[0].id,
                    organizationId: orgId,
                    lastSyncAt: new Date(now.getTime() - 7200000),
                    lastKnownRoles: JSON.stringify(['user']),
                    syncStatus: 'stale',
                    conflictReason: 'User deleted in Pleasanter',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            const status = await PleasanterUserSyncService.getSyncStatus(orgId);
            assert.strictEqual(status.totalMappings, 2);
            assert.strictEqual(status.syncedCount, 1);
            assert.strictEqual(status.staleCount, 1);
            assert.strictEqual(status.conflictCount, 0);
            assert.ok(status.lastSyncAt);
        });
    });
    describe('getReconciliationStatus', () => {
        it('should return pending reconciliation logs', async () => {
            await db.insert(syncReconciliationLogs).values({
                organizationId: orgId,
                syncBatchId: 'batch_001',
                conflictType: 'user_deleted_in_pleasanter',
                pleasanterResourceId: BigInt(300),
                expectedState: JSON.stringify({ deleted: true }),
                actualState: JSON.stringify({ exists: true }),
                resolution: 'manual_review_pending',
                createdAt: new Date(),
            });
            const logs = await PleasanterUserSyncService.getReconciliationStatus(orgId, 10);
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].conflictType, 'user_deleted_in_pleasanter');
            assert.strictEqual(logs[0].resolution, 'manual_review_pending');
        });
    });
});
