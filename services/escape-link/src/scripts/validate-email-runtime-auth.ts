#!/usr/bin/env node
import dotenv from 'dotenv';
import { emailRuntimeConfigFromEnv, verifyEmailRuntimeCredentials } from '../lib/email/outbound.js';
import { injectEmailRuntimeSecretsFromJson } from '../lib/email/runtime-secrets.js';

dotenv.config();
dotenv.config({ path: '.env.runtime', override: false });
const injectedKeys = injectEmailRuntimeSecretsFromJson();

try {
  const config = emailRuntimeConfigFromEnv();
  const checks = await verifyEmailRuntimeCredentials(config);

  console.log('[validate-email-runtime-auth] checks=', JSON.stringify(checks, null, 2));
  if (injectedKeys.length > 0) {
    console.log('[validate-email-runtime-auth] runtime secret keys injected=', injectedKeys.join(','));
  }

  const smtp = checks.find((c) => c.provider === 'smtp');
  if (!smtp?.ok) {
    console.error('[validate-email-runtime-auth] FAIL: SMTP credential check failed');
    process.exit(1);
  }

  console.log('[validate-email-runtime-auth] PASS: SMTP runtime credentials valid');
  const gmail = checks.find((c) => c.provider === 'gmail_api');
  if (gmail) {
    console.log(`[validate-email-runtime-auth] INFO: Gmail API fallback check ${gmail.ok ? 'passed' : 'failed'} (${gmail.detail})`);
  } else {
    console.log('[validate-email-runtime-auth] INFO: Gmail API fallback credentials not configured');
  }
  process.exit(0);
} catch (err) {
  console.error('[validate-email-runtime-auth] ERROR:', err);
  process.exit(1);
}
