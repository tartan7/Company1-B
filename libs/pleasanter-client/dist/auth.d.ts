export interface AuthCredentials {
    apiKey: string;
}
export declare class PleasanterAuth {
    private apiKey;
    constructor(apiKey: string);
    getAuthPayload(): {
        ApiKey: string;
    };
    updateApiKey(apiKey: string): void;
}
//# sourceMappingURL=auth.d.ts.map