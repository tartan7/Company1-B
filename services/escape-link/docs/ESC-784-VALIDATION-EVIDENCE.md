# Outbound Telephony Validation Evidence

**Issue:** ESC-784 / ESC-782
**Date:** 2026-05-28 (UTC)
**Provider:** Twilio Voice API

---

## Validation Method

Deterministic fallback simulation executed via `validate-outbound-fallback.ts`.
This validates the full code path (primary failure → fallback success) without placing a live PSTN call.

Live validation requires Twilio credentials provisioned by Operations (ESC-780).

---

## Implementation Files

| File | Purpose |
|---|---|
| `src/lib/telephony/types.ts` | Type definitions for call config, target, result |
| `src/lib/telephony/outbound.ts` | Core Twilio caller with primary+fallback logic |
| `src/__tests__/outbound-telephony.test.ts` | Unit tests (4 cases) |
| `src/scripts/validate-outbound-fallback.ts` | End-to-end validation harness |
| `docs/ESC-784-OUTBOUND-FALLBACK-RUNBOOK.md` | Operational runbook |
| `.env.example` | Secrets contract template |

---

## Test Cases

| Test | Description | Expected |
|---|---|---|
| 1 | Primary number succeeds | `success=true`, `callSid` set, 1 API call |
| 2 | Primary fails, fallback succeeds | `success=true`, fallback SID, 2 API calls |
| 3 | Primary fails, no fallback | `success=false`, `errorCode` set |
| 4 | Missing env vars | throws "Missing required env vars" |

---

## Residual Risks

- Live PSTN call requires Twilio credentials not yet provisioned (Operations: ESC-780)
- Production alert routing depends on deployment-specific `STATUS_CALLBACK_URL`
- Call timing must be within JST business hours (09:00–17:00 weekdays)
- No recording without verbal consent from recipient (per CEO compliance note in ESC-781)

---

## Next Step

Once Operations provisions Twilio credentials (ESC-780), run live validation:
```bash
DRY_RUN=false node dist/scripts/validate-outbound-fallback.js
```

Post real `callSid` and outcome to ESC-751 and ESC-778.
