import assert from 'node:assert/strict';
import { test } from 'node:test';
import { injectEmailRuntimeSecretsFromJson } from '../lib/email/runtime-secrets.js';

test('injects supported keys from EMAIL_RUNTIME_SECRETS_JSON', () => {
  const env: NodeJS.ProcessEnv = {
    EMAIL_RUNTIME_SECRETS_JSON: JSON.stringify({
      EMAIL_SMTP_HOST: 'smtp.example.com',
      EMAIL_SMTP_PORT: '587',
      EMAIL_SMTP_USER: 'user',
      EMAIL_SMTP_PASS: 'pass',
      EMAIL_FROM: 'growth@example.com',
      UNUSED_KEY: 'ignored',
    }),
  };

  const keys = injectEmailRuntimeSecretsFromJson(env);
  assert.deepEqual(keys.sort(), [
    'EMAIL_FROM',
    'EMAIL_SMTP_HOST',
    'EMAIL_SMTP_PASS',
    'EMAIL_SMTP_PORT',
    'EMAIL_SMTP_USER',
  ]);
  assert.equal(env.EMAIL_SMTP_HOST, 'smtp.example.com');
  assert.equal(env.EMAIL_SMTP_PORT, '587');
});

test('does not override preexisting env vars', () => {
  const env: NodeJS.ProcessEnv = {
    EMAIL_SMTP_HOST: 'existing-host',
    EMAIL_RUNTIME_SECRETS_JSON: JSON.stringify({
      EMAIL_SMTP_HOST: 'new-host',
      EMAIL_SMTP_PORT: '465',
    }),
  };

  const keys = injectEmailRuntimeSecretsFromJson(env);
  assert.deepEqual(keys, ['EMAIL_SMTP_PORT']);
  assert.equal(env.EMAIL_SMTP_HOST, 'existing-host');
  assert.equal(env.EMAIL_SMTP_PORT, '465');
});
