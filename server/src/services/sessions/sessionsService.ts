import crypto from "crypto";
import { nanoid } from "nanoid";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { sessionRedis, sessionGetOrCreate } from "../../db/redis/redis.js";

// Sessions expire after this much inactivity. Redis refreshes the TTL on every
// event (sliding window) and evicts the key automatically once it lapses — there
// is no table to scan and no cleanup cron to run.
const SESSION_TTL_MS = 30 * 60 * 1000;

// Bounded in-process mirror of the last session id Redis handed back for each
// (siteId, session identity). It exists purely so a transient Redis failure can
// reuse the user's *real* session id instead of inventing a divergent one;
// otherwise a single timed-out command fractures one visitor into multiple sessions (events
// that reached Redis keep the real id while the failed event mints a new one).
// Entries slide on every touch and the map is capped LRU-style, so memory stays
// bounded by the active-user count.
const FALLBACK_CACHE_MAX = 50_000;

interface CachedSession {
  sessionId: string;
  expiresAt: number;
}

export class SessionsService {
  private logger = createServiceLogger("sessions");
  private fallbackCache = new Map<string, CachedSession>();

  private getSessionKey(userId: string, siteId: number, identifiedUserId?: string): string {
    if (identifiedUserId) {
      // Do not expose custom user IDs in Redis keys. The anonymous fingerprint
      // remains part of the digest so identified sessions stay fingerprint-scoped,
      // while different identified users behind one proxy cannot share a session.
      const identityHash = crypto
        .createHash("sha256")
        .update(userId)
        .update("\0")
        .update(identifiedUserId)
        .digest("hex");
      return `session:${siteId}:identified:${identityHash}`;
    }

    return `session:${siteId}:${userId}`;
  }

  /**
   * Get the active session id for an anonymous or identified visitor identity,
   * creating one if none exists, and refresh its sliding 30-minute TTL. Backed
   * by Redis, with an in-process fallback so a Redis blip never drops — or
   * splits — a session.
   */
  async updateSession({
    userId,
    identifiedUserId,
    siteId,
  }: {
    userId: string;
    identifiedUserId?: string;
    siteId: number;
  }): Promise<{ sessionId: string }> {
    const key = this.getSessionKey(userId, siteId, identifiedUserId);
    const candidate = nanoid(14);

    try {
      const sessionId = await sessionGetOrCreate(key, candidate, SESSION_TTL_MS);
      this.rememberSession(key, sessionId);
      return { sessionId };
    } catch (error) {
      // A Redis blip must never drop ingestion — and must never split a session.
      // Reuse the last id we handed this user (kept alive in-process on a sliding
      // window) so their events stay glued together until Redis recovers; only
      // mint a fresh id if we've genuinely never seen them on this worker.
      this.logger.error(error as Error, "Redis session lookup failed; using in-process fallback session id");
      return { sessionId: this.fallbackSessionId(key, candidate) };
    }
  }

  /** Cache the resolved session id with a fresh sliding expiry, LRU-bounded. */
  private rememberSession(key: string, sessionId: string): void {
    // Re-insert to mark as most-recently-used (Map preserves insertion order).
    this.fallbackCache.delete(key);
    this.fallbackCache.set(key, { sessionId, expiresAt: Date.now() + SESSION_TTL_MS });
    if (this.fallbackCache.size > FALLBACK_CACHE_MAX) {
      const oldest = this.fallbackCache.keys().next().value;
      if (oldest !== undefined) this.fallbackCache.delete(oldest);
    }
  }

  /**
   * Resolve a session id without Redis. Reuses the last id seen for this user if
   * it's still within the sliding window (refreshing it), otherwise adopts
   * `candidate` as a new session. The result is stored back so subsequent events
   * during the same outage keep the same id — a per-worker stand-in for Redis
   * that stays stable across the 30-minute boundary instead of resetting on it.
   */
  private fallbackSessionId(key: string, candidate: string): string {
    const cached = this.fallbackCache.get(key);
    const sessionId = cached && cached.expiresAt > Date.now() ? cached.sessionId : candidate;
    this.rememberSession(key, sessionId);
    return sessionId;
  }

  /** Close the dedicated session Redis connection during graceful shutdown. */
  async close(): Promise<void> {
    try {
      await sessionRedis.quit();
    } catch (error) {
      this.logger.error(error as Error, "Error closing Redis connection");
    }
  }
}

export const sessionsService = new SessionsService();
