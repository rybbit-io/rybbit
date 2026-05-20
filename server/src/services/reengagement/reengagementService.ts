import { and, between, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import * as cron from "node-cron";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, sites, user } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { isContactUnsubscribed, sendReengagementEmail } from "../../lib/email/email.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { REENGAGEMENT_EMAILS } from "./reengagementContent.js";

class ReengagementService {
  private cronTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("reengagement");

  constructor() {}

  /**
   * Get a site for reengagement email
   * Only returns a siteId if ALL sites have no events (user hasn't started tracking at all)
   */
  private async getSiteWithoutEvents(
    userId: string
  ): Promise<{ hasEvents: boolean; siteId: number | null; domain: string | null }> {
    try {
      // Find organizations where the user is an owner
      const userOrgs = await db
        .select({ organizationId: member.organizationId })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.role, "owner")));

      if (userOrgs.length === 0) {
        return { hasEvents: false, siteId: null, domain: null };
      }

      const orgIds = userOrgs.map(o => o.organizationId);

      // Find sites belonging to these organizations
      const userSites = await db
        .select({ siteId: sites.siteId, domain: sites.domain })
        .from(sites)
        .where(inArray(sites.organizationId, orgIds));

      if (userSites.length === 0) {
        return { hasEvents: false, siteId: null, domain: null };
      }

      const siteIds = userSites.map(s => s.siteId);

      // Check if ANY site has events
      const result = await clickhouse.query({
        query: `
          SELECT 1 FROM events
          WHERE site_id IN ({siteIds:Array(Int32)})
          LIMIT 1
        `,
        format: "JSONEachRow",
        query_params: {
          siteIds,
        },
      });

      const data = await result.json<{ 1: number }>();

      // If any site has events, don't send reengagement email
      if (data.length > 0) {
        return { hasEvents: true, siteId: null, domain: null };
      }

      // No sites have events - return the first site for the dashboard link
      return { hasEvents: false, siteId: userSites[0].siteId, domain: userSites[0].domain };
    } catch (error) {
      this.logger.error({ error, userId }, "Error checking user sites for events");
      return { hasEvents: true, siteId: null, domain: null }; // On error, assume they have events (don't send email)
    }
  }

  /**
   * Process re-engagement emails for a specific day
   */
  private async processDay(targetDay: 3 | 7 | 14): Promise<void> {
    const now = DateTime.utc();
    const content = REENGAGEMENT_EMAILS[targetDay];

    if (!content) {
      this.logger.error({ targetDay }, "No content found for target day");
      return;
    }

    // Find users who signed up exactly targetDay days ago
    const targetStart = now.minus({ days: targetDay }).startOf("day");
    const targetEnd = targetStart.endOf("day");

    try {
      const users = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
        })
        .from(user)
        .where(and(between(user.createdAt, targetStart.toSQL()!, targetEnd.toSQL()!)));

      this.logger.info({ targetDay, userCount: users.length }, "Processing re-engagement emails");

      for (const userData of users) {
        // Check if user has a site without events
        const { hasEvents, siteId, domain } = await this.getSiteWithoutEvents(userData.id);
        if (hasEvents) {
          this.logger.debug({ userId: userData.id }, "User has events, skipping");
          continue;
        }

        if (!siteId || !domain) {
          this.logger.debug({ userId: userData.id }, "User has no sites, skipping");
          continue;
        }

        // Check if contact is unsubscribed
        const unsubscribed = await isContactUnsubscribed(userData.email);
        if (unsubscribed) {
          this.logger.debug({ userId: userData.id }, "User is unsubscribed, skipping");
          continue;
        }

        // Send re-engagement email
        await sendReengagementEmail(userData.email, userData.name, content, siteId, domain);
        this.logger.info({ userId: userData.id, day: targetDay, siteId, domain }, "Sent re-engagement email");
        break;
      }
    } catch (error) {
      this.logger.error({ error, targetDay }, "Error processing re-engagement emails");
    }
  }

  /**
   * Process all re-engagement emails (days 3, 7, 14)
   */
  async processReengagementEmails(): Promise<void> {
    this.logger.info("Starting re-engagement email processing");

    await this.processDay(3);
    await this.processDay(7);
    await this.processDay(14);

    this.logger.info("Completed re-engagement email processing");
  }

  /**
   * Start the daily cron job (10am UTC)
   */
  startReengagementCron(): void {
    if (!IS_CLOUD) {
      return;
    }

    if (this.cronTask) {
      this.logger.warn("Re-engagement cron already running");
      return;
    }

    // Run daily at 10am UTC
    this.cronTask = cron.schedule(
      "0 10 * * *",
      async () => {
        await this.processReengagementEmails();
      },
      { timezone: "UTC" }
    );

    this.logger.info("Re-engagement cron started - runs daily at 10am UTC");
  }

  /**
   * Stop the cron job
   */
  stopReengagementCron(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.logger.info("Re-engagement cron stopped");
    }
  }
}

export const reengagementService = new ReengagementService();
