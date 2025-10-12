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
  async getExistingSession(userId: string, siteId: number) {
    const [existingSession] = await db
      .select()
      .from(activeSessions)
      .where(and(eq(activeSessions.userId, userId), eq(activeSessions.siteId, siteId)))
      .limit(1);

    return existingSession || null;
  }

  async updateSession({ userId, siteId }: { userId: string; siteId: number }): Promise<{ sessionId: string }> {
    const existingSession = await this.getExistingSession(userId, siteId);

    if (existingSession) {
      await db
        .update(activeSessions)
        .set({
          lastActivity: new Date(),
        })
        .where(eq(activeSessions.sessionId, existingSession.sessionId));
      return { sessionId: existingSession.sessionId };
    }

    const insertData = {
      sessionId: crypto.randomUUID(),
      siteId,
      userId,
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
