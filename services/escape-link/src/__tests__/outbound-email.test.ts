import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emailRuntimeConfigFromEnv,
  sendGrowthEmail,
  verifyEmailRuntimeCredentials,
  type EmailRuntimeClients,
} from '../lib/email/outbound.js';
import type { EmailRuntimeConfig } from '../lib/email/types.js';

const baseConfig: EmailRuntimeConfig = {
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'smtp-user',
    pass: 'smtp-pass',
    from: 'growth@example.com',
  },
  gmailApi: {
    accessToken: 'token',
    sender: 'growth@example.com',
  },
};

test('uses SMTP when SMTP send succeeds', async () => {
  const clients: EmailRuntimeClients = {
    createSmtpTransport: () => ({ verify: async () => undefined, sendMail: async () => ({ messageId: 'smtp-1' }) }),
    gmailApiSend: async () => ({ id: 'gmail-1' }),
    gmailApiProfile: async () => ({ emailAddress: 'growth@example.com' }),
  };

  const result = await sendGrowthEmail(baseConfig, { to: 'user@example.com', subject: 's', text: 't' }, clients);
  assert.equal(result.success, true);
  assert.equal(result.provider, 'smtp');
});

test('falls back to Gmail API when SMTP send fails', async () => {
  const clients: EmailRuntimeClients = {
    createSmtpTransport: () => ({ verify: async () => undefined, sendMail: async () => { throw new Error('smtp down'); } }),
    gmailApiSend: async () => ({ id: 'gmail-2' }),
    gmailApiProfile: async () => ({ emailAddress: 'growth@example.com' }),
  };

  const result = await sendGrowthEmail(baseConfig, { to: 'user@example.com', subject: 's', text: 't' }, clients);
  assert.equal(result.success, true);
  assert.equal(result.provider, 'gmail_api');
});

test('returns failure when SMTP and Gmail API both fail', async () => {
  const clients: EmailRuntimeClients = {
    createSmtpTransport: () => ({ verify: async () => undefined, sendMail: async () => { throw new Error('smtp down'); } }),
    gmailApiSend: async () => { throw new Error('token expired'); },
    gmailApiProfile: async () => ({ emailAddress: 'growth@example.com' }),
  };

  const result = await sendGrowthEmail(baseConfig, { to: 'user@example.com', subject: 's', text: 't' }, clients);
  assert.equal(result.success, false);
  assert.match(result.errorMessage ?? '', /smtp_failed/);
  assert.match(result.errorMessage ?? '', /gmail_api_failed/);
});

test('emailRuntimeConfigFromEnv enforces required SMTP vars', () => {
  const backup = {
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
    EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT,
    EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
    EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  delete process.env.EMAIL_SMTP_HOST;
  delete process.env.EMAIL_SMTP_PORT;
  delete process.env.EMAIL_SMTP_USER;
  delete process.env.EMAIL_SMTP_PASS;
  delete process.env.EMAIL_FROM;

  assert.throws(() => emailRuntimeConfigFromEnv(), /Missing required env vars/);
  Object.assign(process.env, backup);
});

test('verifyEmailRuntimeCredentials checks SMTP and Gmail profile', async () => {
  const clients: EmailRuntimeClients = {
    createSmtpTransport: () => ({ verify: async () => undefined, sendMail: async () => ({ messageId: 'unused' }) }),
    gmailApiSend: async () => ({ id: 'unused' }),
    gmailApiProfile: async () => ({ emailAddress: 'growth@example.com' }),
  };

  const checks = await verifyEmailRuntimeCredentials(baseConfig, clients);
  assert.deepEqual(checks.map((c) => ({ provider: c.provider, ok: c.ok })), [
    { provider: 'smtp', ok: true },
    { provider: 'gmail_api', ok: true },
  ]);
});
