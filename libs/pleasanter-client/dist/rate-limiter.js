export class RateLimiter {
    constructor(config) {
        this.requests = [];
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
    }
    async waitIfNeeded() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.waitIfNeeded();
            }
        }
        this.requests.push(now);
    }
    getRemainingRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
    resetWindow() {
        this.requests = [];
    }
}
//# sourceMappingURL=rate-limiter.js.map