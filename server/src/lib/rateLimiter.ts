import { IS_CLOUD } from "./const.js";

// In-memory rate limiter for API keys
class ApiKeyRateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests = 20; // 20 requests per second
  private readonly windowMs = 1000; // 1 second window

  isAllowed(apiKey: string): boolean {
    if (!IS_CLOUD) {
      return true; // No rate limiting for self-hosted
    }

    const now = Date.now();
    const existing = this.limits.get(apiKey);

    if (!existing || now >= existing.resetTime) {
      // New window or expired window
      this.limits.set(apiKey, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    existing.count++;
    return true;
  }

  // Clean up expired entries to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (now >= value.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

export const apiKeyRateLimiter = new ApiKeyRateLimiter();

// Clean up expired entries every 5 minutes
if (IS_CLOUD) {
  setInterval(
    () => {
      apiKeyRateLimiter.cleanup();
    },
    5 * 60 * 1000
  );
}
