import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import activitiesRouter from './activities';
import { getClient } from '../db';

const app = express();
app.use(express.json());
app.use('/activities', activitiesRouter);

describe('Activities Routes - Publish Endpoint', () => {
  let testUserId: bigint;
  let testActivityId: bigint;
  let authToken: string;

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

      // Create test activity
      const activityResult = await client.query(
        `INSERT INTO activities (host_id, title, description, category, price_per_person, currency, max_capacity, duration, location, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [testUserId, 'Test Activity', 'Test Description', 'Adventure', '99.99', 'USD', 10, 60, 'Test Location', 'active']
      );
      testActivityId = BigInt(activityResult.rows[0].id);

      await client.query('COMMIT');

      // Create auth token
      authToken = jwt.sign(
        { userId: testUserId.toString(), role: 'operator' },
        process.env.JWT_SECRET || 'secret'
      );
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM resource_versions WHERE resource_id = $1', [testActivityId]);
      await client.query('DELETE FROM activities WHERE host_id = $1', [testUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });

  describe('POST /activities/:id/publish', () => {
    it('should publish an activity with valid auth', async () => {
      const response = await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Activity published successfully');
      expect(response.body).toHaveProperty('version', 2);
      expect(response.body).toHaveProperty('activityId');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .expect(401);
    });

    it('should fail for non-existent activity', async () => {
      const response = await request(app)
        .post('/activities/999999/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Activity not found');
    });

    it('should create immutable snapshot', async () => {
      const publishResponse = await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(publishResponse.body.version).toBe(2);

      // Fetch versions
      const versionsResponse = await request(app)
        .get(`/activities/${testActivityId}/versions`)
        .expect(200);

      expect(versionsResponse.body).toHaveProperty('versions');
      expect(versionsResponse.body.versions).toHaveLength(1);
      expect(versionsResponse.body.versions[0].version).toBe(2);
      expect(versionsResponse.body.versions[0].status).toBe('published');
    });

    it('should support multiple publishes and increment version', async () => {
      const publish1 = await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const publish2 = await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(publish1.body.version).toBe(2);
      expect(publish2.body.version).toBe(3);
    });

    it('should fail for archived activity', async () => {
      const client = await getClient();
      try {
        await client.query(
          'UPDATE activities SET status = $1 WHERE id = $2',
          ['archived', testActivityId]
        );
      } finally {
        client.release();
      }

      const response = await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('archived');
    });
  });

  describe('GET /activities/:id/versions', () => {
    it('should list activity versions', async () => {
      // Publish twice
      await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .post(`/activities/${testActivityId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get(`/activities/${testActivityId}/versions`)
        .expect(200);

      expect(response.body).toHaveProperty('activityId');
      expect(response.body).toHaveProperty('versions');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body.versions).toHaveLength(2);
      expect(response.body.versions[0].version).toBe(2);
      expect(response.body.versions[1].version).toBe(3);
    });

    it('should return empty versions for unpublished activity', async () => {
      const response = await request(app)
        .get(`/activities/${testActivityId}/versions`)
        .expect(200);

      expect(response.body.versions).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should fail for non-existent activity', async () => {
      await request(app)
        .get('/activities/999999/versions')
        .expect(404);
    });
  });

  describe('GET /activities/:id', () => {
    it('should fetch activity from database', async () => {
      const response = await request(app)
        .get(`/activities/${testActivityId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Test Activity');
      expect(response.body).toHaveProperty('description', 'Test Description');
      expect(response.body).toHaveProperty('category', 'Adventure');
      expect(response.body).toHaveProperty('id', testActivityId.toString());
    });

    it('should fail for non-existent activity', async () => {
      await request(app)
        .get('/activities/999999')
        .expect(404);
    });
  });
});
