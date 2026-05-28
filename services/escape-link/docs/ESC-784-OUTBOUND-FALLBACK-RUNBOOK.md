# Outbound Nitto Fallback Call — Operational Runbook

**Issue:** ESC-784 / ESC-782
**Provider:** Twilio Voice API
**Last Updated:** 2026-05-28

---

## Trigger Conditions

Execute this runbook when:
1. The Wakkanai Chamber email (wcci@rose.ocn.ne.jp) has not delivered a commitment by **May 29 09:00 JST** (00:00 UTC), AND
2. Fallback call to Nittō Suisan (日東水産株式会社) has not yet been placed.

---

## Prerequisites

| Requirement | Source |
|---|---|
| Twilio account + API key | Operations agent / user provisioning |
| `TWILIO_ACCOUNT_SID` | 1Password / vault |
| `TWILIO_AUTH_TOKEN` | 1Password / vault |
| `TWILIO_FROM_NUMBER` | Twilio console (outbound-capable number) |
| Node.js ≥ 18 | Runtime environment |

---

## Quick Execution (Dry Run Simulation)

```bash
cd services/escape-link
pnpm install       # or npm install
pnpm build
node dist/scripts/validate-outbound-fallback.js
```

Expected output includes:
- `intentId: outbound-esc784-XXXXX`
- Primary failure (simulated `provider_timeout`)
- Fallback success with call SID

---

## Live Call Execution

1. Copy `.env.example` to `.env` and fill in real credentials:
   ```bash
   cp .env.example .env
   # edit .env with Twilio credentials from vault
   ```
2. Set `DRY_RUN=false`:
   ```bash
   DRY_RUN=false node dist/scripts/validate-outbound-fallback.js
   ```
3. Capture the output. Note: `callSid`, `numberDialed`, `timestamp`, `status`.
4. Post evidence to ESC-751 and ESC-778 immediately after the call.

### Call Script (Japanese)

The script for the live call is injected automatically:
> 日東水産株式会社様、こちらはEscheatからの電話です。稚内商工会議所を通じた中小企業向けソリューション検証に関するご連絡です。ご対応のほどよろしくお願い申し上げます。

For verbal conversations, follow up with:
- Explain the SMB validation interview program
- Request 30-min discovery call with management
- Provide contact: growth@escheat.io

---

## Target Numbers

| Number | Use |
|---|---|
| 0162-23-3460 (Primary) | Direct Nittō Suisan line |
| 0162-23-3140 (Fallback) | Alternative company number |

E.164 format: `+81162233460` and `+81162233140`

---

## Call Window

**Business hours JST**: 09:00–17:00 on weekdays.
Do not place calls outside this window without CEO approval.

---

## Rollback / Failure Path

| Scenario | Action |
|---|---|
| Both numbers fail (no answer / busy) | Log attempt with timestamp + outcome. Post to ESC-751/ESC-778. Retry next business day. |
| Twilio API error | Check credentials and account status. Escalate to CTO if unresolved within 30 min. |
| Answered but wrong person | Politely explain the purpose and ask to be connected to management or leave callback details. |
| Call completed, no commitment | Log outcome. Escalate to CEO for next step decision. |

---

## Evidence to Post (Required)

After every call attempt, post this evidence block to ESC-751 and ESC-778:

```
- UTC timestamp: YYYY-MM-DDTHH:MM:SSZ
- Number dialed: +8116XXXXXXX
- Call SID: CAXXXXXXXX
- Who answered: [name / voicemail / no answer]
- Outcome: [verbatim summary / commitment made / escalation needed]
- Next step: [schedule follow-up / escalate / done]
```

---

## Monitoring & Alerting

- Twilio call logs available in Twilio Console > Monitor > Calls
- Set `STATUS_CALLBACK_URL` in `.env` to receive webhook on call completion
- Alert the Operations agent and CTO if the call fails after 2 attempts

---

## Related Issues

- ESC-751: Wakkanai Chamber outreach (May 30 deadline)
- ESC-778: Chamber email or phone fallback
- ESC-779: Nitto fallback — CTO execution
- ESC-780: Operations provisioning and call execution
- ESC-782: CTO implementation (this runbook's parent)
