import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PleasanterClient } from './client.js';
import { PleasanterAuth } from './auth.js';
import { Paginator } from './pagination.js';

test('PleasanterAuth - validates API key', () => {
  assert.throws(() => new PleasanterAuth(''), /API key is required/);
  assert.throws(() => new PleasanterAuth('  '), /API key is required/);

  const auth = new PleasanterAuth('test-key-123');
  assert.deepEqual(auth.getAuthPayload(), { ApiKey: 'test-key-123' });
});

test('PleasanterAuth - trims whitespace', () => {
  const auth = new PleasanterAuth('  test-key  ');
  assert.deepEqual(auth.getAuthPayload(), { ApiKey: 'test-key' });
});

test('PleasanterAuth - updates API key', () => {
  const auth = new PleasanterAuth('initial-key');
  auth.updateApiKey('updated-key');
  assert.deepEqual(auth.getAuthPayload(), { ApiKey: 'updated-key' });
});

test('Paginator - validates pagination options', () => {
  assert.throws(() => Paginator.validateOptions({ page: 0 }), /Page must be >= 1/);
  assert.throws(() => Paginator.validateOptions({ pageSize: 0 }), /Page size must be >= 1/);
  assert.throws(
    () => Paginator.validateOptions({ pageSize: 1001 }),
    /Page size cannot exceed 1000/
  );

  const valid = Paginator.validateOptions({ page: 2, pageSize: 100 });
  assert.deepEqual(valid, { page: 2, pageSize: 100 });
});

test('Paginator - builds query params', () => {
  const params = Paginator.buildQueryParams({ page: 2, pageSize: 50 });
  assert.deepEqual(params, { page: 2, pageSize: 50 });

  const defaults = Paginator.buildQueryParams();
  assert.deepEqual(defaults, { page: 1, pageSize: 50 });
});

test('Paginator - creates paginated response', () => {
  const data = [{ id: '1' }, { id: '2' }];
  const response = Paginator.createResponse(data, 1, 50, 100);

  assert.equal(response.data.length, 2);
  assert.equal(response.page, 1);
  assert.equal(response.pageSize, 50);
  assert.equal(response.total, 100);
  assert.equal(response.hasMore, true);
});

test('Paginator - hasMore flag', () => {
  const response1 = Paginator.createResponse([], 1, 50, 50);
  assert.equal(response1.hasMore, false);

  const response2 = Paginator.createResponse([], 1, 50, 51);
  assert.equal(response2.hasMore, true);
});

test('Paginator - generates page numbers', () => {
  const pages = Array.from(Paginator.generatePages(100, 25));
  assert.deepEqual(pages, [1, 2, 3, 4]);

  const pages2 = Array.from(Paginator.generatePages(50, 50));
  assert.deepEqual(pages2, [1]);
});

test('PleasanterClient - initialization', () => {
  const client = new PleasanterClient({
    baseUrl: 'https://pleasanter.example.com',
    apiKey: 'test-key',
    tenantId: 'tenant-1',
  });

  assert.equal(client.getTenantId(), 'tenant-1');
  assert.ok(client.getRemainingRequests() > 0);
});

test('PleasanterClient - handles base URL trailing slash', () => {
  const client1 = new PleasanterClient({
    baseUrl: 'https://pleasanter.example.com',
    apiKey: 'test-key',
  });

  const client2 = new PleasanterClient({
    baseUrl: 'https://pleasanter.example.com/',
    apiKey: 'test-key',
  });

  assert.equal(client1.getTenantId(), client2.getTenantId());
});

test('PleasanterClient - tenant ID management', () => {
  const client = new PleasanterClient({
    baseUrl: 'https://pleasanter.example.com',
    apiKey: 'test-key',
  });

  assert.equal(client.getTenantId(), undefined);

  client.setTenantId('new-tenant');
  assert.equal(client.getTenantId(), 'new-tenant');
});

test('PleasanterClient - rate limit management', () => {
  const client = new PleasanterClient({
    baseUrl: 'https://pleasanter.example.com',
    apiKey: 'test-key',
  });

  const remaining = client.getRemainingRequests();
  assert.ok(typeof remaining === 'number');
  assert.ok(remaining > 0);

  client.resetRateLimit();
  assert.equal(client.getRemainingRequests(), 100); // Default rate limit
});
