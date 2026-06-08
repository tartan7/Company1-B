import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import authRoutes from './auth';
import { UserService } from '../services/userService';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    // Clear users between tests
    // Note: In-memory storage doesn't have a clear method, so we'd need to add one
    // For now, we'll test with unique emails
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123',
        });

      assert.strictEqual(response.status, 201);
      assert(response.body.id);
      assert.strictEqual(response.body.email, 'test@example.com');
      assert(!response.body.passwordHash);
    });

    it('should return 400 for duplicate email', async () => {
      const email = `duplicate_${Date.now()}@example.com`;
      const password = 'ValidPass123';

      // Register first user
      await request(app)
        .post('/auth/register')
        .send({ email, password });

      // Try to register duplicate
      const response = await request(app)
        .post('/auth/register')
        .send({ email, password });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Email already registered'));
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123',
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Invalid email format'));
    });

    it('should return 400 for password without uppercase letter', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'validpass123',
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.details.some((msg: string) => msg.includes('uppercase')));
    });

    it('should return 400 for password without number', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'ValidPass',
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.details.some((msg: string) => msg.includes('number')));
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'Valid1',
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.details.some((msg: string) => msg.includes('8 characters')));
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          password: 'ValidPass123',
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Email and password are required'));
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Email and password are required'));
    });
  });

  describe('POST /auth/login', () => {
    const loginEmail = `login_${Date.now()}@example.com`;
    const loginPassword = 'ValidPass123';

    beforeEach(async () => {
      // Clear previous test data and create a test user
      UserService.clearForTesting();
      await UserService.createUser({
        email: loginEmail,
        password: loginPassword,
      });
    });

    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: loginPassword,
        });

      assert.strictEqual(response.status, 200);
      assert(response.body.token);
      assert(response.body.user);
      assert.strictEqual(response.body.user.email, loginEmail);
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: loginPassword,
        });

      assert.strictEqual(response.status, 401);
      assert(response.body.error.includes('Invalid email or password'));
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: 'WrongPass123',
        });

      assert.strictEqual(response.status, 401);
      assert(response.body.error.includes('Invalid email or password'));
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: loginPassword,
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Email and password are required'));
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
        });

      assert.strictEqual(response.status, 400);
      assert(response.body.error.includes('Email and password are required'));
    });

    it('should set secure HTTP-only cookie with token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: loginPassword,
        });

      assert.strictEqual(response.status, 200);
      const setCookieHeader = response.headers['set-cookie'];
      assert(setCookieHeader);
      assert(setCookieHeader[0].includes('HttpOnly'));
      assert(setCookieHeader[0].includes('SameSite=Strict'));
    });
  });
});
