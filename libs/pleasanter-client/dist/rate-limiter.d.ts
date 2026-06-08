import { RateLimitConfig } from './types.js';
export declare class RateLimiter {
    private maxRequests;
    private windowMs;
    private requests;
    constructor(config: RateLimitConfig);
    waitIfNeeded(): Promise<void>;
    getRemainingRequests(): number;
    resetWindow(): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map