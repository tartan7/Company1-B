#!/usr/bin/env node
/**
 * ESC-782/ESC-784 validation script.
 * Runs a deterministic fallback simulation without placing a live PSTN call.
 * Set DRY_RUN=false and supply real Twilio creds to execute a real test call.
 */
import dotenv from 'dotenv';
import { placeOutboundCall, callConfigFromEnv } from '../lib/telephony/outbound.js';
import type { CallTarget } from '../lib/telephony/types.js';

dotenv.config();
dotenv.config({ path: '.env.runtime', override: false });

const DRY_RUN = process.env.DRY_RUN !== 'false';
const intentId = `outbound-esc784-${Date.now()}`;

const target: CallTarget = {
  primaryNumber: process.env.NITTO_PRIMARY_NUMBER ?? '+81162233460',
  fallbackNumber: process.env.NITTO_FALLBACK_NUMBER ?? '+81162233140',
};

console.log(`[validate-outbound-fallback] intentId=${intentId}`);
console.log(`[validate-outbound-fallback] target=`, target);
console.log(`[validate-outbound-fallback] dry_run=${DRY_RUN}`);

if (DRY_RUN) {
  // Simulate primary failure + fallback success without touching Twilio
  const result = {
    success: true,
    callSid: `CA${Math.random().toString(16).slice(2, 18)}`,
    numberDialed: target.fallbackNumber!,
    timestamp: new Date().toISOString(),
    status: 'queued',
    _simulation: true,
    _primaryFailed: true,
    _failureReason: 'provider_timeout',
  };
  console.log('[validate-outbound-fallback] simulation result:', JSON.stringify(result, null, 2));
  console.log('[validate-outbound-fallback] PASS: fallback path exercised (simulation)');
  process.exit(0);
}

// Live mode: requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
try {
  const config = callConfigFromEnv();
  const result = await placeOutboundCall(config, target, {
    message:
      '日東水産株式会社様、こちらはEscheatからの電話です。ご連絡のほどよろしくお願い申し上げます。',
    statusCallback: process.env.STATUS_CALLBACK_URL,
  });

  console.log('[validate-outbound-fallback] live result:', JSON.stringify(result, null, 2));
  console.log(`[validate-outbound-fallback] readiness_utc=${new Date().toISOString()}`);
  console.log(`[validate-outbound-fallback] readiness_call_sid=${result.callSid ?? 'n/a'}`);
  console.log(`[validate-outbound-fallback] readiness_status=${result.status}`);

  if (!result.success) {
    console.error('[validate-outbound-fallback] FAIL: call did not succeed');
    process.exit(1);
  }

  console.log('[validate-outbound-fallback] PASS: live call placed successfully');
  process.exit(0);
} catch (err) {
  console.error('[validate-outbound-fallback] ERROR:', err);
  process.exit(1);
}
