import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeOutboundCall, callConfigFromEnv } from '../lib/telephony/outbound.js';
import type { CallConfig, CallTarget, TwilioCallsClient } from '../lib/telephony/outbound.js';
import type { CallConfig as CC, CallTarget as CT } from '../lib/telephony/types.js';

const config: CallConfig = {
  accountSid: 'ACtest',
  authToken: 'token',
  fromNumber: '+81111111111',
};

function makeClient(
  impl: () => Promise<{ sid: string; status: string }>,
): TwilioCallsClient {
  return { create: impl };
}

test('places call to primary number successfully', async () => {
  let called = 0;
  const client = makeClient(async () => {
    called++;
    return { sid: 'CA_TEST_SID_001', status: 'queued' };
  });
  const target: CallTarget = { primaryNumber: '+81162233460' };
  const result = await placeOutboundCall(config, target, { message: 'テスト通話です。' }, client);

  assert.equal(result.success, true);
  assert.equal(result.numberDialed, '+81162233460');
  assert.equal(result.callSid, 'CA_TEST_SID_001');
  assert.equal(called, 1);
});

test('falls back to secondary number when primary fails', async () => {
  let callCount = 0;
  const client = makeClient(async () => {
    callCount++;
    if (callCount === 1) throw Object.assign(new Error('provider_timeout'), { code: 20008 });
    return { sid: 'CA_FALLBACK_SID', status: 'queued' };
  });
  const target: CallTarget = {
    primaryNumber: '+81162233460',
    fallbackNumber: '+81162233140',
  };
  const result = await placeOutboundCall(config, target, {}, client);

  assert.equal(result.success, true);
  assert.equal(result.numberDialed, '+81162233140');
  assert.equal(result.callSid, 'CA_FALLBACK_SID');
  assert.equal(callCount, 2);
});

test('returns failure result when no fallback and primary fails', async () => {
  const client = makeClient(async () => {
    throw Object.assign(new Error('invalid_number'), { code: 21211 });
  });
  const target: CallTarget = { primaryNumber: '+81162233460' };
  const result = await placeOutboundCall(config, target, {}, client);

  assert.equal(result.success, false);
  assert.equal(result.status, 'failed');
  assert.ok(result.errorCode);
});

test('callConfigFromEnv throws when env vars missing', () => {
  const backup = [
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_FROM_NUMBER,
  ];
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;

  assert.throws(() => callConfigFromEnv(), /Missing required env vars/);

  [process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_FROM_NUMBER] =
    backup as [string, string, string];
});
