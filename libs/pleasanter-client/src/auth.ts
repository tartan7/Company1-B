export interface AuthCredentials {
  apiKey: string;
}

export class PleasanterAuth {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey.trim();
  }

  getAuthPayload(): { ApiKey: string } {
    return {
      ApiKey: this.apiKey,
    };
  }

  updateApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey.trim();
  }
}
