export class PleasanterAuth {
    constructor(apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('API key is required');
        }
        this.apiKey = apiKey.trim();
    }
    getAuthPayload() {
        return {
            ApiKey: this.apiKey,
        };
    }
    updateApiKey(apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('API key is required');
        }
        this.apiKey = apiKey.trim();
    }
}
//# sourceMappingURL=auth.js.map