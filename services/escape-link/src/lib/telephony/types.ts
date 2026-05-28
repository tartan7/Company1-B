export interface CallConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface CallTarget {
  primaryNumber: string;
  fallbackNumber?: string;
}

export interface CallResult {
  success: boolean;
  callSid?: string;
  numberDialed: string;
  timestamp: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface OutboundCallOptions {
  /** TwiML URL for call instructions; if omitted, uses default message */
  twimlUrl?: string;
  /** Webhook URL to receive call status updates */
  statusCallback?: string;
  /** Message to say via TwiML (only used if twimlUrl is omitted) */
  message?: string;
}
