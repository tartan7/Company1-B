import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import adminRoutes from './admin';
import { db } from '../db';
import { organizations, users, userPleasanterMappings } from '../db/schema';
import { eq } from 'drizzle-orm';
describe('Admin Routes', () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
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
    describe('POST /admin/sync/users', () => {
        it('should sync users with valid input', async () => {
            const response = await request(app)
                .post('/admin/sync/users')
                .query({ organization_id: orgId.toString() })
                .send({
                pleasanterUsers: [
                    {
                        id: BigInt(501),
                        email: 'sync-test1@example.com',
                        firstName: 'Sync',
                        lastName: 'Test1',
                        roles: ['admin'],
                        lastModified: new Date(),
                    },
                    {
                        id: BigInt(502),
                        email: 'sync-test2@example.com',
                        firstName: 'Sync',
                        lastName: 'Test2',
                        roles: ['user'],
                        lastModified: new Date(),
                    },
                ],
            });
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.data.usersCreated, 2);
            assert.strictEqual(response.body.data.usersUpdated, 0);
            assert.strictEqual(response.body.data.conflictsDetected, 0);
        });
        it('should support dry-run mode', async () => {
            const response = await request(app)
                .post('/admin/sync/users')
                .query({ dry_run: 'true', organization_id: orgId.toString() })
                .send({
                pleasanterUsers: [
                    {
                        id: BigInt(503),
                        email: 'dryrun@example.com',
                        firstName: 'DryRun',
                        lastName: 'Test',
                        roles: ['user'],
                        lastModified: new Date(),
                    },
                ],
            });
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.status, 'preview');
            // Verify user was not created
            const user = await db
                .select()
                .from(users)
                .where(eq(users.email, 'dryrun@example.com'));
            assert.strictEqual(user.length, 0);
        });
        it('should reject empty user list', async () => {
            const response = await request(app)
                .post('/admin/sync/users')
                .query({ organization_id: orgId.toString() })
                .send({
                pleasanterUsers: [],
            });
            assert.strictEqual(response.status, 400);
            assert.ok(response.body.message.includes('required'));
        });
        it('should handle missing pleasanterUsers', async () => {
            const response = await request(app)
                .post('/admin/sync/users')
                .query({ organization_id: orgId.toString() })
                .send({});
            assert.strictEqual(response.status, 400);
        });
    });
    describe('GET /admin/sync/status', () => {
        it('should return sync status', async () => {
            // Create a user and mapping
            const user = await db
                .insert(users)
                .values({
                email: 'status-test@example.com',
                firstName: 'Status',
                lastName: 'Test',
                passwordHash: 'hash',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            await db.insert(userPleasanterMappings).values({
                pleasanterUserId: BigInt(601),
                localUserId: user[0].id,
                organizationId: orgId,
                lastSyncAt: new Date(),
                lastKnownRoles: JSON.stringify(['admin']),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const response = await request(app)
                .get('/admin/sync/status')
                .query({ organization_id: orgId.toString() });
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.data.syncStatus.totalMappings, 1);
            assert.strictEqual(response.body.data.syncStatus.syncedCount, 1);
        });
    });
    describe('GET /admin/sync/reconciliation', () => {
        it('should return reconciliation logs', async () => {
            const response = await request(app)
                .get('/admin/sync/reconciliation')
                .query({ organization_id: orgId.toString() });
            assert.strictEqual(response.status, 200);
            assert.ok(Array.isArray(response.body.data.logs));
        });
    });
});
