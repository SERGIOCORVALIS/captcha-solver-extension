/**
 * Rate Limiter for API Requests
 * Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if we're under the limit
    if (this.requests.length < this.config.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(): number {
    if (this.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...this.requests);
    const windowStart = Date.now() - this.config.windowMs;
    const timeUntilOldestExpires = oldestRequest - windowStart;

    return Math.max(0, timeUntilOldestExpires);
  }

  /**
   * Wait until request is allowed
   */
  async waitUntilAllowed(): Promise<void> {
    while (!this.isAllowed()) {
      const waitTime = this.getTimeUntilNextRequest();
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime + 100)); // Add small buffer
      }
    }
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}
