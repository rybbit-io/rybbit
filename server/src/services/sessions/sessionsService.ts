import crypto from "crypto";
import { nanoid } from "nanoid";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { sessionRedis, sessionGetOrCreate } from "../../db/redis/redis.js";
import { pickReplaySession, REPLAY_SESSION_LUA } from "./replaySession.js";

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
  // Like fallbackCache, for the session each replay is recording into: kept on
  // every replay batch Redis resolves, and slid only by replay batches, so a
  // Redis outage neither moves a replay to an invented id nor splits it every
  // 30 minutes (each split a fresh size budget).
  private replayFallbackCache = new Map<string, CachedSession>();

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
      this.rememberSession(this.fallbackCache, key, sessionId);
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

  /**
   * The session a session replay batch belongs to (see replaySession.ts),
   * resolved without renewing the analytics session: an open tab sends batches
   * on background DOM churn alone, and that used to keep the visitor's session
   * alive indefinitely. Only tracked events renew it now.
   * `needsFullSnapshot` asks the recorder for one: the replay is waiting to
   * follow a new session, or has none in the session it opened.
   */
  async resolveReplaySession({
    userId,
    identifiedUserId,
    siteId,
    hasFullSnapshot,
  }: {
    userId: string;
    identifiedUserId?: string;
    siteId: number;
    hasFullSnapshot: boolean;
  }): Promise<{ sessionId: string; needsFullSnapshot: boolean }> {
    const key = this.getSessionKey(userId, siteId, identifiedUserId);
    const candidate = nanoid(14);

    try {
      const [sessionId, needsFullSnapshot] = (await sessionRedis.eval(
        REPLAY_SESSION_LUA,
        2,
        key,
        `replay-${key}`,
        candidate,
        SESSION_TTL_MS,
        hasFullSnapshot ? "1" : "0"
      )) as [string, number];
      // Only a session this created starts a fresh window in the fallback
      // mirror; an existing one keeps the expiry its events gave it.
      if (sessionId === candidate) {
        this.rememberSession(this.fallbackCache, key, sessionId);
      }
      this.rememberSession(this.replayFallbackCache, key, sessionId);
      return { sessionId, needsFullSnapshot: Number(needsFullSnapshot) === 1 };
    } catch (error) {
      this.logger.error(error as Error, "Redis session lookup failed; using in-process fallback session id");
      return this.fallbackReplaySession(key, candidate, hasFullSnapshot);
    }
  }

  /** Cache the resolved session id with a fresh sliding expiry, LRU-bounded. */
  private rememberSession(cache: Map<string, CachedSession>, key: string, sessionId: string): void {
    // Re-insert to mark as most-recently-used (Map preserves insertion order).
    cache.delete(key);
    cache.set(key, { sessionId, expiresAt: Date.now() + SESSION_TTL_MS });
    if (cache.size > FALLBACK_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  private liveSessionId(cache: Map<string, CachedSession>, key: string): string | null {
    const cached = cache.get(key);
    return cached && cached.expiresAt > Date.now() ? cached.sessionId : null;
  }

  /**
   * Resolve a session id without Redis. Reuses the last id seen for this user if
   * it's still within the sliding window (refreshing it), otherwise adopts
   * `candidate` as a new session. The result is stored back so subsequent events
   * during the same outage keep the same id — a per-worker stand-in for Redis
   * that stays stable across the 30-minute boundary instead of resetting on it.
   */
  private fallbackSessionId(key: string, candidate: string): string {
    const sessionId = this.liveSessionId(this.fallbackCache, key) ?? candidate;
    this.rememberSession(this.fallbackCache, key, sessionId);
    return sessionId;
  }

  /** `resolveReplaySession` without Redis, on the in-process mirrors. */
  private fallbackReplaySession(
    key: string,
    candidate: string,
    hasFullSnapshot: boolean
  ): { sessionId: string; needsFullSnapshot: boolean } {
    const choice = pickReplaySession(
      this.liveSessionId(this.fallbackCache, key),
      this.liveSessionId(this.replayFallbackCache, key),
      hasFullSnapshot
    );
    const sessionId = choice.sessionId ?? candidate;
    if (choice.sessionId === null) {
      this.rememberSession(this.fallbackCache, key, sessionId);
    }
    this.rememberSession(this.replayFallbackCache, key, sessionId);
    return { sessionId, needsFullSnapshot: choice.needsFullSnapshot };
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
