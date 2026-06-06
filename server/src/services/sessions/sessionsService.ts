import { nanoid } from "nanoid";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { redis, sessionGetOrCreate } from "../../db/redis/redis.js";

// Sessions expire after this much inactivity. Redis refreshes the TTL on every
// event (sliding window) and evicts the key automatically once it lapses — there
// is no table to scan and no cleanup cron to run.
const SESSION_TTL_MS = 30 * 60 * 1000;

export class SessionsService {
  private logger = createServiceLogger("sessions");

  private getSessionKey(userId: string, siteId: number): string {
    return `session:${siteId}:${userId}`;
  }

  /**
   * Get the active session id for a (userId, siteId) pair, creating one if none
   * exists, and refresh its sliding 30-minute TTL. Backed entirely by Redis.
   */
  async updateSession({ userId, siteId }: { userId: string; siteId: number }): Promise<{ sessionId: string }> {
    const key = this.getSessionKey(userId, siteId);
    const candidate = nanoid(14);

    try {
      const sessionId = await sessionGetOrCreate(key, candidate, SESSION_TTL_MS);
      return { sessionId };
    } catch (error) {
      // A Redis blip must never drop ingestion. Fall back to a deterministic,
      // window-stable id so events in the same 30-minute bucket still share a
      // session until Redis recovers.
      this.logger.error(error as Error, "Redis session lookup failed; using fallback session id");
      return { sessionId: this.fallbackSessionId(userId, siteId) };
    }
  }

  private fallbackSessionId(userId: string, siteId: number): string {
    const bucket = Math.floor(Date.now() / SESSION_TTL_MS);
    return `f_${siteId}_${userId}_${bucket}`;
  }

  /** Close the Redis connection during graceful shutdown. */
  async close(): Promise<void> {
    try {
      await redis.quit();
    } catch (error) {
      this.logger.error(error as Error, "Error closing Redis connection");
    }
  }
}

export const sessionsService = new SessionsService();
