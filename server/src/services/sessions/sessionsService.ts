import { and, desc, eq, gte, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as cron from "node-cron";
import { db } from "../../db/postgres/postgres.js";
import { activeSessions } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = parsePositiveInt(process.env.TRACKING_SESSION_TOUCH_INTERVAL_MS, 5 * 60 * 1000);
const SESSION_DB_STALE_GRACE_MS = SESSION_TOUCH_INTERVAL_MS;
const SESSION_CACHE_PRUNE_INTERVAL_MS = parsePositiveInt(
  process.env.TRACKING_SESSION_CACHE_PRUNE_INTERVAL_MS,
  60 * 1000
);
const SESSION_CACHE_MAX_ENTRIES = parsePositiveInt(process.env.TRACKING_SESSION_CACHE_MAX_ENTRIES, 100_000);

interface CachedSession {
  sessionId: string;
  expiresAt: number;
  touchDueAt: number;
  pendingTouch?: Promise<void>;
}

export class SessionsService {
  private cleanupTask: cron.ScheduledTask | null = null;
  private cacheMaintenanceInterval: NodeJS.Timeout | null = null;
  private logger = createServiceLogger("sessions");
  private sessionCache = new Map<string, CachedSession>();
  private pendingLookups = new Map<string, Promise<{ sessionId: string }>>();

  constructor() {
    this.startCacheMaintenance();
  }

  private startCacheMaintenance() {
    this.cacheMaintenanceInterval = setInterval(() => {
      this.pruneSessionCache();
      this.enforceSessionCacheLimit();
    }, SESSION_CACHE_PRUNE_INTERVAL_MS);
    this.cacheMaintenanceInterval.unref?.();
  }

  private initializeCleanupCron() {
    this.cleanupTask = cron.schedule(
      "* * * * *",
      async () => {
        try {
          const deletedCount = await this.cleanupOldSessions();
          // Uncomment for debugging
          this.logger.debug(`Cleaned up ${deletedCount} expired sessions`);
        } catch (error) {
          this.logger.error(error as Error, "Error during session cleanup");
        }
      },
      { timezone: "UTC" }
    );

    this.logger.info("Session cleanup cron initialized (runs every minute)");
  }
  private getSessionCacheKey(userId: string, siteId: number) {
    return `${siteId}:${userId}`;
  }

  private cacheSession(key: string, sessionId: string, nowMs: number, lastActivityMs = nowMs) {
    this.sessionCache.delete(key);
    this.sessionCache.set(key, {
      sessionId,
      expiresAt: nowMs + SESSION_TIMEOUT_MS,
      touchDueAt: Math.max(nowMs, lastActivityMs + SESSION_TOUCH_INTERVAL_MS),
    });
    this.enforceSessionCacheLimit();
  }

  private pruneSessionCache(nowMs = Date.now()) {
    for (const [key, cached] of this.sessionCache) {
      if (cached.expiresAt <= nowMs) {
        this.sessionCache.delete(key);
      }
    }
  }

  private enforceSessionCacheLimit() {
    while (this.sessionCache.size > SESSION_CACHE_MAX_ENTRIES) {
      const oldestKey = this.sessionCache.keys().next().value;
      if (oldestKey === undefined) break;
      this.sessionCache.delete(oldestKey);
    }
  }

  private getTimestampMs(value: Date | string | null | undefined) {
    if (!value) return 0;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  async getExistingSession(userId: string, siteId: number, now = new Date()) {
    const activeSince = new Date(now.getTime() - SESSION_TIMEOUT_MS - SESSION_DB_STALE_GRACE_MS);
    const [existingSession] = await db
      .select()
      .from(activeSessions)
      .where(
        and(
          eq(activeSessions.userId, userId),
          eq(activeSessions.siteId, siteId),
          gte(activeSessions.lastActivity, activeSince)
        )
      )
      .orderBy(desc(activeSessions.lastActivity))
      .limit(1);

    return existingSession || null;
  }

  private async touchCachedSession(key: string, cached: CachedSession, now: Date, nowMs: number) {
    if (cached.pendingTouch) {
      await cached.pendingTouch;
      return;
    }

    cached.touchDueAt = nowMs + SESSION_TOUCH_INTERVAL_MS;
    const touch = db
      .update(activeSessions)
      .set({
        lastActivity: now,
      })
      .where(eq(activeSessions.sessionId, cached.sessionId))
      .then(() => undefined)
      .catch(error => {
        cached.touchDueAt = nowMs;
        throw error;
      })
      .finally(() => {
        if (cached.pendingTouch === touch) {
          cached.pendingTouch = undefined;
        }
      });

    cached.pendingTouch = touch;
    await touch;
    cached.expiresAt = nowMs + SESSION_TIMEOUT_MS;
    this.sessionCache.set(key, cached);
  }

  async updateSession({ userId, siteId }: { userId: string; siteId: number }): Promise<{ sessionId: string }> {
    const now = new Date();
    const nowMs = now.getTime();
    const key = this.getSessionCacheKey(userId, siteId);
    const cached = this.sessionCache.get(key);

    if (cached && cached.expiresAt > nowMs) {
      cached.expiresAt = nowMs + SESSION_TIMEOUT_MS;
      this.sessionCache.delete(key);
      this.sessionCache.set(key, cached);
      if (cached.touchDueAt <= nowMs) {
        await this.touchCachedSession(key, cached, now, nowMs);
      }
      return { sessionId: cached.sessionId };
    }

    this.sessionCache.delete(key);

    const pendingLookup = this.pendingLookups.get(key);
    if (pendingLookup) {
      return pendingLookup;
    }

    const lookup = this.refreshSessionFromStore(key, userId, siteId, now, nowMs).finally(() => {
      this.pendingLookups.delete(key);
    });

    this.pendingLookups.set(key, lookup);
    return lookup;
  }

  private async refreshSessionFromStore(
    key: string,
    userId: string,
    siteId: number,
    now: Date,
    nowMs: number
  ): Promise<{ sessionId: string }> {
    const existingSession = await this.getExistingSession(userId, siteId, now);

    if (existingSession) {
      const lastActivityMs = this.getTimestampMs(existingSession.lastActivity);
      if (nowMs - lastActivityMs >= SESSION_TOUCH_INTERVAL_MS) {
        await db
          .update(activeSessions)
          .set({
            lastActivity: now,
          })
          .where(eq(activeSessions.sessionId, existingSession.sessionId));
      }
      this.cacheSession(key, existingSession.sessionId, nowMs, Math.max(lastActivityMs, nowMs));
      return { sessionId: existingSession.sessionId };
    }

    const insertData = {
      sessionId: nanoid(14),
      siteId,
      userId,
      startTime: now,
      lastActivity: now,
    };

    await db.insert(activeSessions).values(insertData);
    this.cacheSession(key, insertData.sessionId, nowMs);
    return { sessionId: insertData.sessionId };
  }

  async cleanupOldSessions(): Promise<number> {
    // Persisted lastActivity can lag the cache by the touch throttle.
    const expiredBefore = new Date(Date.now() - SESSION_TIMEOUT_MS - SESSION_DB_STALE_GRACE_MS);

    const deletedSessions = await db
      .delete(activeSessions)
      .where(lt(activeSessions.lastActivity, expiredBefore))
      .returning();

    this.pruneSessionCache();
    this.enforceSessionCacheLimit();

    // this.logger.debug(`Cleaned up ${deletedSessions.length} sessions`);
    return deletedSessions.length;
  }

  // Method to stop the cleanup cron job (useful for graceful shutdown)
  startCleanupCron() {
    this.initializeCleanupCron();
  }

  stopCleanupCron() {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.logger.info("Session cleanup cron stopped");
    }
    if (this.cacheMaintenanceInterval) {
      clearInterval(this.cacheMaintenanceInterval);
      this.cacheMaintenanceInterval = null;
    }
  }
}

export const sessionsService = new SessionsService();
