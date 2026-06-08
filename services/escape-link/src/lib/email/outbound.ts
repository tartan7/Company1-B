import nodemailer from 'nodemailer';
import type {
  AuthCheckResult,
  EmailRuntimeConfig,
  GmailApiConfig,
  GrowthEmailMessage,
  SendEmailResult,
  SmtpConfig,
} from './types.js';

export type { EmailRuntimeConfig, GrowthEmailMessage, SendEmailResult };

interface SmtpTransport {
  verify: () => Promise<unknown>;
  sendMail: (params: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<{ messageId?: string }>;
}

export interface EmailRuntimeClients {
  createSmtpTransport: (config: SmtpConfig) => SmtpTransport;
  gmailApiSend: (config: GmailApiConfig, message: GrowthEmailMessage) => Promise<{ id?: string }>;
  gmailApiProfile: (config: GmailApiConfig) => Promise<{ emailAddress?: string }>;
}

const defaultClients: EmailRuntimeClients = {
  createSmtpTransport: (config) =>
    nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
  gmailApiSend: async (config, message) => {
    const mime = [
      `From: ${config.sender}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      message.text,
    ].join('\r\n');

    const raw = Buffer.from(mime).toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`gmail_api_send_failed status=${res.status} body=${body}`);
    }

    return (await res.json()) as { id?: string };
  },
  gmailApiProfile: async (config) => {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`gmail_api_profile_failed status=${res.status} body=${body}`);
    }

    return (await res.json()) as { emailAddress?: string };
  },
};

export function emailRuntimeConfigFromEnv(): EmailRuntimeConfig {
  const host = process.env.EMAIL_SMTP_HOST;
  const portRaw = process.env.EMAIL_SMTP_PORT;
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error(
      'Missing required env vars: EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS, EMAIL_FROM',
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('EMAIL_SMTP_PORT must be a positive number');
  }

  const secure = process.env.EMAIL_SMTP_SECURE === 'true';
  const config: EmailRuntimeConfig = {
    smtp: { host, port, secure, user, pass, from },
  };

  const accessToken = process.env.EMAIL_GMAIL_API_ACCESS_TOKEN;
  const sender = process.env.EMAIL_GMAIL_SENDER ?? from;
  if (accessToken) config.gmailApi = { accessToken, sender };

  return config;
}

export async function sendGrowthEmail(
  config: EmailRuntimeConfig,
  message: GrowthEmailMessage,
  clients: EmailRuntimeClients = defaultClients,
): Promise<SendEmailResult> {
  const timestamp = new Date().toISOString();
  const smtpTransport = clients.createSmtpTransport(config.smtp);

  try {
    const smtp = await smtpTransport.sendMail({ from: config.smtp.from, ...message });
    return { success: true, provider: 'smtp', messageId: smtp.messageId, timestamp };
  } catch (smtpErr) {
    if (!config.gmailApi) {
      return {
        success: false,
        provider: 'smtp',
        timestamp,
        errorMessage: `smtp_failed: ${String((smtpErr as Error).message ?? smtpErr)}`,
      };
    }

    try {
      const gmail = await clients.gmailApiSend(config.gmailApi, message);
      return { success: true, provider: 'gmail_api', messageId: gmail.id, timestamp };
    } catch (gmailErr) {
      return {
        success: false,
        provider: 'gmail_api',
        timestamp,
        errorMessage:
          `smtp_failed: ${String((smtpErr as Error).message ?? smtpErr)}; ` +
          `gmail_api_failed: ${String((gmailErr as Error).message ?? gmailErr)}`,
      };
    }
  }
}

export async function verifyEmailRuntimeCredentials(
  config: EmailRuntimeConfig,
  clients: EmailRuntimeClients = defaultClients,
): Promise<AuthCheckResult[]> {
  const results: AuthCheckResult[] = [];
  const smtpTransport = clients.createSmtpTransport(config.smtp);

  try {
    await smtpTransport.verify();
    results.push({ provider: 'smtp', ok: true, detail: 'smtp_verify_passed' });
  } catch (err) {
    results.push({ provider: 'smtp', ok: false, detail: `smtp_verify_failed: ${String(err)}` });
  }

  if (config.gmailApi) {
    try {
      const profile = await clients.gmailApiProfile(config.gmailApi);
      results.push({ provider: 'gmail_api', ok: true, detail: `gmail_profile_ok:${profile.emailAddress ?? 'unknown'}` });
    } catch (err) {
      results.push({ provider: 'gmail_api', ok: false, detail: `gmail_profile_failed: ${String(err)}` });
    }
  }

  return results;
}
