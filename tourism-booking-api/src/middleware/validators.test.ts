import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEmail, validatePassword, sanitizeInput } from './validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      assert.strictEqual(validateEmail('test@example.com'), true);
      assert.strictEqual(validateEmail('user.name@domain.co.uk'), true);
      assert.strictEqual(validateEmail('test+tag@example.com'), true);
    });

    it('should return false for invalid email', () => {
      assert.strictEqual(validateEmail('invalid.email'), false);
      assert.strictEqual(validateEmail('test@'), false);
      assert.strictEqual(validateEmail('@example.com'), false);
      assert.strictEqual(validateEmail('test @example.com'), false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for password meeting all requirements', () => {
      const result = validatePassword('ValidPass123');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should return invalid for password without uppercase', () => {
      const result = validatePassword('validpass123');
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(msg => msg.includes('uppercase')));
    });

    it('should return invalid for password without number', () => {
      const result = validatePassword('ValidPassword');
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(msg => msg.includes('number')));
    });

    it('should return invalid for password shorter than 8 characters', () => {
      const result = validatePassword('Valid1');
      assert.strictEqual(result.valid, false);
      assert(result.errors.some(msg => msg.includes('8 characters')));
    });

    it('should return multiple errors for password failing multiple criteria', () => {
      const result = validatePassword('weak');
      assert.strictEqual(result.valid, false);
      assert(result.errors.length > 1);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove angle brackets', () => {
      assert.strictEqual(sanitizeInput('<script>alert("xss")</script>'), 'scriptalert("xss")/script');
    });

    it('should trim whitespace', () => {
      assert.strictEqual(sanitizeInput('  hello  '), 'hello');
    });

    it('should leave safe input unchanged (except trim)', () => {
      assert.strictEqual(sanitizeInput('  test@example.com  '), 'test@example.com');
    });
  });
});
