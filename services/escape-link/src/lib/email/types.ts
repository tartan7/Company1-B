export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface GmailApiConfig {
  accessToken: string;
  sender: string;
}

export interface EmailRuntimeConfig {
  smtp: SmtpConfig;
  gmailApi?: GmailApiConfig;
}

export interface GrowthEmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'smtp' | 'gmail_api';
  messageId?: string;
  timestamp: string;
  errorMessage?: string;
}

export interface AuthCheckResult {
  provider: 'smtp' | 'gmail_api';
  ok: boolean;
  detail: string;
}
