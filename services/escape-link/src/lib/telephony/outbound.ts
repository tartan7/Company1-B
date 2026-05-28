import twilio from 'twilio';
import type { CallConfig, CallTarget, CallResult, OutboundCallOptions } from './types.js';
export type { CallConfig, CallTarget };

const DEFAULT_MESSAGE =
  'This is an automated call from Escheat. We are following up on a business inquiry.';

function buildTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="ja-JP">${message}</Say></Response>`;
}

/** Minimal interface for the Twilio calls resource (allows injection in tests) */
export interface TwilioCallsClient {
  create: (params: {
    from: string;
    to: string;
    url?: string;
    twiml?: string;
    statusCallback?: string;
  }) => Promise<{ sid: string; status: string }>;
}

async function attemptCall(
  callsClient: TwilioCallsClient,
  from: string,
  to: string,
  opts: OutboundCallOptions,
): Promise<CallResult> {
  const timestamp = new Date().toISOString();
  try {
    const call = await callsClient.create({
      from,
      to,
      ...(opts.twimlUrl
        ? { url: opts.twimlUrl }
        : { twiml: buildTwiml(opts.message ?? DEFAULT_MESSAGE) }),
      ...(opts.statusCallback ? { statusCallback: opts.statusCallback } : {}),
    });
    return { success: true, callSid: call.sid, numberDialed: to, timestamp, status: call.status };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    return {
      success: false,
      numberDialed: to,
      timestamp,
      status: 'failed',
      errorCode: String(e.code ?? 'unknown'),
      errorMessage: e.message ?? String(err),
    };
  }
}

/**
 * Places an outbound call to the primary number; falls back to the secondary
 * number if the primary attempt fails (provider error or timeout).
 *
 * @param callsClient - Twilio calls resource (injectable for testing)
 */
export async function placeOutboundCall(
  config: CallConfig,
  target: CallTarget,
  opts: OutboundCallOptions = {},
  callsClient?: TwilioCallsClient,
): Promise<CallResult> {
  const client = callsClient ?? twilio(config.accountSid, config.authToken).calls;

  const primary = await attemptCall(client, config.fromNumber, target.primaryNumber, opts);
  if (primary.success) return primary;

  if (target.fallbackNumber) {
    return attemptCall(client, config.fromNumber, target.fallbackNumber, opts);
  }

  return primary;
}

/** Loads CallConfig from environment variables. Throws if required vars are missing. */
export function callConfigFromEnv(): CallConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Missing required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
    );
  }
  return { accountSid, authToken, fromNumber };
}
