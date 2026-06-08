import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UserService } from './userService';
describe('UserService', () => {
    describe('createUser', () => {
        it('should create a user with hashed password', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const user = await UserService.createUser({ email, password });
            assert(user.id);
            assert.strictEqual(user.email, email);
            assert(user.createdAt instanceof Date);
            // UserResponse should not include passwordHash
            assert.strictEqual(Object.keys(user).length, 3);
        });
        it('should throw error for duplicate email', async () => {
            const email = `duplicate_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            await UserService.createUser({ email, password });
            try {
                await UserService.createUser({ email, password });
                assert.fail('Should have thrown an error');
            }
            catch (error) {
                assert(error instanceof Error);
                assert.strictEqual(error.message, 'Email already exists');
            }
        });
    });
    describe('getUserById', () => {
        it('should retrieve user by id', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const created = await UserService.createUser({ email, password });
            const retrieved = UserService.getUserById(created.id);
            assert(retrieved);
            assert.strictEqual(retrieved.email, email);
        });
        it('should return null for non-existent user', () => {
            const user = UserService.getUserById('non_existent_id');
            assert.strictEqual(user, null);
        });
    });
    describe('getUserByEmail', () => {
        it('should retrieve user by email (case-insensitive)', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            await UserService.createUser({ email, password });
            const retrieved = UserService.getUserByEmail(email.toUpperCase());
            assert(retrieved);
            assert.strictEqual(retrieved.email, email);
        });
        it('should return null for non-existent email', () => {
            const user = UserService.getUserByEmail('nonexistent@example.com');
            assert.strictEqual(user, null);
        });
    });
    describe('verifyPassword', () => {
        it('should return true for correct password', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const userResponse = await UserService.createUser({ email, password });
            const user = UserService.getUserById(userResponse.id);
            assert(user);
            const isValid = await UserService.verifyPassword(user, password);
            assert.strictEqual(isValid, true);
        });
        it('should return false for incorrect password', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const userResponse = await UserService.createUser({ email, password });
            const user = UserService.getUserById(userResponse.id);
            assert(user);
            const isValid = await UserService.verifyPassword(user, 'WrongPass123');
            assert.strictEqual(isValid, false);
        });
        it('should use bcrypt with 10+ rounds', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const userResponse = await UserService.createUser({ email, password });
            const user = UserService.getUserById(userResponse.id);
            assert(user);
            // Extract rounds from hash (bcrypt format: $2b$10$...)
            const rounds = parseInt(user.passwordHash.split('$')[2], 10);
            assert(rounds >= 10);
        });
    });
    describe('toResponse', () => {
        it('should exclude password hash from response', async () => {
            const email = `user_${Date.now()}@example.com`;
            const password = 'ValidPass123';
            const userResponse = await UserService.createUser({ email, password });
            const user = UserService.getUserById(userResponse.id);
            assert(user);
            const response = UserService.toResponse(user);
            assert.strictEqual(response.email, email);
            assert(response.id);
            assert(response.createdAt instanceof Date);
            // Verify passwordHash is not in the response
            assert.strictEqual(Object.keys(response).length, 3);
            assert(Object.keys(response).every(key => ['id', 'email', 'createdAt'].includes(key)));
        });
    });
});
