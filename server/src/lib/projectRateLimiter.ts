const DEFAULT_MAX_REQUESTS = parseInt(process.env.PROJECT_API_RATE_LIMIT ?? "600", 10);
const DEFAULT_WINDOW_MS = parseInt(process.env.PROJECT_API_RATE_WINDOW_MS ?? `${60_000}`, 10);

type RateWindow = {
  count: number;
  resetTime: number;
};

export class ProjectRateLimiter {
  private readonly limits = new Map<string, RateWindow>();

  constructor(
    private readonly maxRequests: number = DEFAULT_MAX_REQUESTS,
    private readonly windowMs: number = DEFAULT_WINDOW_MS
  ) {}

  isAllowed(projectId: string): boolean {
    if (this.maxRequests <= 0) {
      return true;
    }

    const now = Date.now();
    const existing = this.limits.get(projectId);

    if (!existing || now >= existing.resetTime) {
      this.limits.set(projectId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      return false;
    }

    existing.count += 1;
    return true;
  }

  getResetTime(projectId: string): number | null {
    const entry = this.limits.get(projectId);
    return entry ? entry.resetTime : null;
  }

  cleanup(now = Date.now()): void {
    for (const [key, value] of this.limits.entries()) {
      if (now >= value.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

export const projectRateLimiter = new ProjectRateLimiter();

setInterval(() => {
  projectRateLimiter.cleanup();
}, DEFAULT_WINDOW_MS).unref();
