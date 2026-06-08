import { describe, it } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import versionsRouter from './versions';
import jwt from 'jsonwebtoken';
const app = express();
app.use(express.json());
app.use('/api/v1', versionsRouter);
// Mock token generator
const generateToken = (userId, role = 'operator') => {
    return jwt.sign({ userId, role }, 'secret');
};
describe('Versioning API Endpoints', () => {
    describe('POST /api/v1/:resourceType/:id/publish', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/publish');
            assert.strictEqual(response.status, 401);
            assert(response.body.error);
        });
        it('should return 403 for non-operator users', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/publish')
                .set('Authorization', `Bearer ${generateToken('1', 'user')}`);
            assert.strictEqual(response.status, 403);
            assert(response.body.error);
        });
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .post('/api/v1/invalid/1/publish')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
    });
    describe('GET /api/v1/:resourceType/:id/versions', () => {
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .get('/api/v1/invalid/1/versions');
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
    });
    describe('GET /api/v1/:resourceType/:id/versions/:version', () => {
        it('should return 400 for invalid version number', async () => {
            const response = await request(app)
                .get('/api/v1/activity/1/versions/invalid');
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
        it('should return 400 for zero or negative version', async () => {
            const response = await request(app)
                .get('/api/v1/activity/1/versions/0');
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .get('/api/v1/invalid/1/versions/1');
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
    });
    describe('GET /api/v1/:resourceType/:id/current-version', () => {
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .get('/api/v1/invalid/1/current-version');
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
    });
    describe('PATCH /api/v1/:resourceType/:id/versions/:version/delete', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .patch('/api/v1/activity/1/versions/1/delete');
            assert.strictEqual(response.status, 401);
            assert(response.body.error);
        });
        it('should return 403 for non-operator users', async () => {
            const response = await request(app)
                .patch('/api/v1/activity/1/versions/1/delete')
                .set('Authorization', `Bearer ${generateToken('1', 'user')}`);
            assert.strictEqual(response.status, 403);
            assert(response.body.error);
        });
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .patch('/api/v1/invalid/1/versions/1/delete')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
        it('should return 400 for invalid version number', async () => {
            const response = await request(app)
                .patch('/api/v1/activity/1/versions/invalid/delete')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
        it('should return 400 for zero or negative version', async () => {
            const response = await request(app)
                .patch('/api/v1/activity/1/versions/0/delete')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
    });
    describe('POST /api/v1/:resourceType/:id/versions/:version/restore', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/versions/1/restore');
            assert.strictEqual(response.status, 401);
            assert(response.body.error);
        });
        it('should return 403 for non-operator users', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/versions/1/restore')
                .set('Authorization', `Bearer ${generateToken('1', 'user')}`);
            assert.strictEqual(response.status, 403);
            assert(response.body.error);
        });
        it('should return 400 for invalid resource type', async () => {
            const response = await request(app)
                .post('/api/v1/invalid/1/versions/1/restore')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid resource type');
        });
        it('should return 400 for invalid version number', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/versions/invalid/restore')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
        it('should return 400 for zero or negative version', async () => {
            const response = await request(app)
                .post('/api/v1/activity/1/versions/0/restore')
                .set('Authorization', `Bearer ${generateToken('1')}`);
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid version number');
        });
    });
    describe('Error Handling and Validation', () => {
        it('should validate resource type for all endpoints', async () => {
            const invalidTypes = ['user', 'post', 'comment', 'invalid'];
            for (const type of invalidTypes) {
                const response = await request(app)
                    .get(`/api/v1/${type}/1/versions`);
                assert.strictEqual(response.status, 400);
                assert.strictEqual(response.body.error, 'Invalid resource type');
            }
        });
        it('should validate resource type for soft-delete endpoint', async () => {
            const invalidTypes = ['user', 'post', 'comment', 'invalid'];
            for (const type of invalidTypes) {
                const response = await request(app)
                    .patch(`/api/v1/${type}/1/versions/1/delete`)
                    .set('Authorization', `Bearer ${generateToken('1')}`);
                assert.strictEqual(response.status, 400);
                assert.strictEqual(response.body.error, 'Invalid resource type');
            }
        });
        it('should validate resource type for restore endpoint', async () => {
            const invalidTypes = ['user', 'post', 'comment', 'invalid'];
            for (const type of invalidTypes) {
                const response = await request(app)
                    .post(`/api/v1/${type}/1/versions/1/restore`)
                    .set('Authorization', `Bearer ${generateToken('1')}`);
                assert.strictEqual(response.status, 400);
                assert.strictEqual(response.body.error, 'Invalid resource type');
            }
        });
    });
});
