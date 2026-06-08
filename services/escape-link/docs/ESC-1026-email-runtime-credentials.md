# ESC-1026 Runtime Email Credential Path (Growth Sends)

## Selected provider path
- Primary provider: SMTP (`sendGrowthEmail` attempts SMTP first)
- Fallback provider: Gmail API (`users.messages.send`) when SMTP send fails

## Runtime secret/env contract
- `EMAIL_SMTP_HOST` — SMTP server hostname. Consumed by `emailRuntimeConfigFromEnv()` in `src/lib/email/outbound.ts`.
- `EMAIL_SMTP_PORT` — SMTP server port. Consumed by `emailRuntimeConfigFromEnv()`.
- `EMAIL_SMTP_SECURE` — `true|false` TLS mode. Consumed by `emailRuntimeConfigFromEnv()`.
- `EMAIL_SMTP_USER` — SMTP username. Consumed by `emailRuntimeConfigFromEnv()`.
- `EMAIL_SMTP_PASS` — SMTP password/app-password. Consumed by `emailRuntimeConfigFromEnv()`.
- `EMAIL_FROM` — sender envelope/header address. Consumed by `emailRuntimeConfigFromEnv()` and send functions.
- `EMAIL_GMAIL_API_ACCESS_TOKEN` — optional Gmail OAuth access token for fallback provider.
- `EMAIL_GMAIL_SENDER` — optional explicit Gmail sender address (defaults to `EMAIL_FROM`).

## Non-interactive auth-check command
- Build: `npm run build`
- Check: `npm run validate:email-auth`

The check verifies SMTP `verify()` and (if configured) Gmail profile endpoint, without sending recipient mail.

## Sender policy/compliance limits and risk controls
- SMTP sender identity must match authenticated mailbox/domain policy.
- Gmail API quotas/anti-abuse controls can throttle or reject high-volume sends.
- Keep Gmail path as fallback resilience, not bulk-primary.
- Auth-check does not send production messages.
