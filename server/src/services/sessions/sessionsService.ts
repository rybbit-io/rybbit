import { and, eq, lt } from "drizzle-orm";
import * as cron from "node-cron";
import { db } from "../../db/postgres/postgres.js";
import { activeSessions } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

class SessionsService {
  private cleanupTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("sessions");

  constructor() {
    this.initializeCleanupCron();
  }

  private initializeCleanupCron() {
    this.cleanupTask = cron.schedule("* * * * *", async () => {
      try {
        const deletedCount = await this.cleanupOldSessions();
        // Uncomment for debugging
        this.logger.debug(`Cleaned up ${deletedCount} expired sessions`);
      } catch (error) {
        this.logger.error(error as Error, "Error during session cleanup");
      }
    });

    this.logger.info("Session cleanup cron initialized (runs every minute)");
  }
  async getExistingSession(userId: string, siteId: string) {
    const siteIdNumber = parseInt(siteId, 10);

    const [existingSession] = await db
      .select()
      .from(activeSessions)
      .where(and(eq(activeSessions.userId, userId), eq(activeSessions.siteId, siteIdNumber)))
      .limit(1);

    return existingSession || null;
  }

  async updateSession(payload: { userId: string; site_id: string }): Promise<{ sessionId: string }> {
    const existingSession = await this.getExistingSession(payload.userId, payload.site_id);

    if (existingSession) {
      await db
        .update(activeSessions)
        .set({
          lastActivity: new Date(),
        })
        .where(eq(activeSessions.sessionId, existingSession.sessionId));
      return { sessionId: existingSession.sessionId };
    }

    // Insert new session with Drizzle - only include columns that exist in schema
    const insertData = {
      sessionId: crypto.randomUUID(),
      siteId: typeof payload.site_id === "string" ? parseInt(payload.site_id, 10) : payload.site_id,
      userId: payload.userId,
      startTime: new Date(),
      lastActivity: new Date(),
    };

    await db.insert(activeSessions).values(insertData);
    return { sessionId: insertData.sessionId };
  }

  async cleanupOldSessions(): Promise<number> {
    // Delete sessions older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const deletedSessions = await db
      .delete(activeSessions)
      .where(lt(activeSessions.lastActivity, thirtyMinutesAgo))
      .returning();

    // this.logger.debug(`Cleaned up ${deletedSessions.length} sessions`);
    return deletedSessions.length;
  }

  // Method to stop the cleanup cron job (useful for graceful shutdown)
  stopCleanupCron() {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.logger.info("Session cleanup cron stopped");
    }
  }
}

export const sessionsService = new SessionsService();
