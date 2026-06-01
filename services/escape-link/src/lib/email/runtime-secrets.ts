const EMAIL_SECRET_KEYS = [
  'EMAIL_SMTP_HOST',
  'EMAIL_SMTP_PORT',
  'EMAIL_SMTP_SECURE',
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
  'EMAIL_FROM',
  'EMAIL_GMAIL_API_ACCESS_TOKEN',
  'EMAIL_GMAIL_SENDER',
] as const;

type EmailSecretKey = (typeof EMAIL_SECRET_KEYS)[number];
type RuntimeSecretPayload = Partial<Record<EmailSecretKey, string>>;

export function injectEmailRuntimeSecretsFromJson(env = process.env): EmailSecretKey[] {
  const payload = env.EMAIL_RUNTIME_SECRETS_JSON;
  if (!payload) return [];

  let parsed: RuntimeSecretPayload;
  try {
    parsed = JSON.parse(payload) as RuntimeSecretPayload;
  } catch (err) {
    throw new Error(`EMAIL_RUNTIME_SECRETS_JSON is not valid JSON: ${String(err)}`);
  }

  const injected: EmailSecretKey[] = [];
  for (const key of EMAIL_SECRET_KEYS) {
    const value = parsed[key];
    if (typeof value !== 'string' || value.length === 0) continue;
    if (!env[key]) {
      env[key] = value;
      injected.push(key);
    }
  }

  return injected;
}
