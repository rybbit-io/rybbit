import { and, isNull, lt } from "drizzle-orm";
import * as cron from "node-cron";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { siteConfigurationLifecycle } from "./siteConfigurationLifecycle.js";

/**
 * Deletes sites created from the landing-page domain input that were never
 * claimed. A site is unclaimed while organizationId is null; claimExpiresAt is
 * set at creation and cleared on claim, so `organizationId IS NULL AND
 * claim_expires_at < now()` is exactly the expired set.
 */
class UnclaimedSiteCleanupService {
  private logger = createServiceLogger("unclaimed-site-cleanup");
  private task: cron.ScheduledTask | null = null;

  public startCleanupCron() {
    if (this.task) return;

    this.task = cron.schedule(
      "*/10 * * * *",
      async () => {
        try {
          await this.deleteExpiredSites();
        } catch (error) {
          this.logger.error({ err: error }, "Error deleting expired unclaimed sites");
        }
      },
      { timezone: "UTC", noOverlap: true }
    );

    this.logger.info("Unclaimed site cleanup cron initialized (runs every 10 minutes)");
  }

  public stopCleanupCron() {
    this.task?.stop();
    this.task = null;
  }

  public async deleteExpiredSites(): Promise<number> {
    const before = new Date().toISOString();
    const expired = await db
      .select({ siteId: sites.siteId, domain: sites.domain })
      .from(sites)
      .where(and(isNull(sites.organizationId), lt(sites.claimExpiresAt, before)));

    let deleted = 0;
    for (const site of expired) {
      try {
        if (await siteConfigurationLifecycle.deleteExpired(site.siteId, before)) deleted++;
      } catch (error) {
        this.logger.error({ err: error, siteId: site.siteId }, "Failed to delete expired unclaimed site");
      }
    }

    if (deleted > 0) {
      this.logger.info({ deleted }, "Deleted expired unclaimed sites");
    }

    return deleted;
  }
}

export const unclaimedSiteCleanupService = new UnclaimedSiteCleanupService();
