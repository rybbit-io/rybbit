import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import * as cron from "node-cron";
import Stripe from "stripe";
import { processResults } from "../api/analytics/utils/utils.js";
import { clickhouse } from "../db/clickhouse/clickhouse.js";
import { db } from "../db/postgres/postgres.js";
import { member, organization, sites, user } from "../db/postgres/schema.js";
import { IS_CLOUD, USAGE_COUNTED_EVENT_TYPES } from "../lib/const.js";
import { sendApproachingLimitEmail, sendLimitExceededEmail } from "../lib/email/email.js";
import { createServiceLogger } from "../lib/logger/logger.js";
import {
  getAllStripeSubscriptionsByCustomer,
  getBestSubscriptionFromStripeSub,
  getReplayLimit,
  stripeSubscriptionInfoFromSnapshot,
  subscriptionIncludesReplay,
  SubscriptionInfo,
} from "../lib/subscriptionUtils.js";

type UsageUpdateCallback = () => void;

class UsageService {
  private sitesOverLimit = new Set<number>();
  // Sites that should not record session replays right now: their organization's plan
  // doesn't include replays, or its monthly replay quota is exhausted. Empty until the
  // usage cron runs (and always empty when self-hosted), so enforcement fails open.
  private sitesWithoutReplay = new Set<number>();
  private usageCheckTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("usage-checker");
  private onUsageUpdatedCallbacks: UsageUpdateCallback[] = [];

  constructor() {}

  /**
   * Sets the sitesOverLimit set (used by workers receiving IPC updates from primary)
   */
  public setSitesOverLimit(sites: Set<number>): void {
    this.sitesOverLimit = sites;
  }

  /**
   * Sets the sitesWithoutReplay set (used by workers receiving IPC updates from primary)
   */
  public setSitesWithoutReplay(sites: Set<number>): void {
    this.sitesWithoutReplay = sites;
  }

  /**
   * Register a callback to be invoked after usage data is updated.
   * Used by the cluster primary to broadcast sitesOverLimit to workers.
   */
  public onUsageUpdated(callback: UsageUpdateCallback): void {
    this.onUsageUpdatedCallbacks.push(callback);
  }

  /**
   * Initialize the cron job for checking monthly usage
   */
  private initializeUsageCheckCron() {
    if (IS_CLOUD && process.env.NODE_ENV !== "development") {
      // Schedule the monthly usage checker to run every 30 minutes
      this.usageCheckTask = cron.schedule(
        "*/30 * * * *",
        async () => {
          try {
            await this.updateOrganizationsMonthlyUsage();
          } catch (error) {
            this.logger.error(error as Error, "Error during usage check");
          }
        },
        { timezone: "UTC" }
      );

      this.logger.info("Monthly usage check cron initialized (runs every 30 minutes)");
    }
  }

  /**
   * Gets the set of site IDs that are over their monthly limit
   */
  public getSitesOverLimit(): Set<number> {
    return this.sitesOverLimit;
  }

  /**
   * Checks if a site is over its monthly limit
   */
  public isSiteOverLimit(siteId: number): boolean {
    return this.sitesOverLimit.has(siteId);
  }

  /**
   * Gets the set of site IDs whose plan does not include session replay
   */
  public getSitesWithoutReplay(): Set<number> {
    return this.sitesWithoutReplay;
  }

  /**
   * Checks if a site's plan excludes session replay
   */
  public isSiteWithoutReplay(siteId: number): boolean {
    return this.sitesWithoutReplay.has(siteId);
  }

  /**
   * Gets the first day of the current month in YYYY-MM-DD format using Luxon
   */
  private getStartOfMonth(): string {
    return DateTime.now().startOf("month").toISODate() as string;
  }

  /**
   * Gets the emails of all organization owners
   */
  private async getOrganizationOwnerEmails(organizationId: string): Promise<string[]> {
    try {
      const owners = await db
        .select({
          email: user.email,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")));

      return owners.map(owner => owner.email);
    } catch (error) {
      this.logger.error(error as Error, `Error getting owner emails for organization ${organizationId}`);
      return [];
    }
  }

  /**
   * Gets all sites with their organization IDs (excludes sites without an organization)
   */
  private async getAllSites(): Promise<Array<{ siteId: number; organizationId: string }>> {
    try {
      const allSites = await db
        .select({
          siteId: sites.siteId,
          organizationId: sites.organizationId,
        })
        .from(sites);

      // Filter out sites without an organization ID
      return allSites.filter(site => site.organizationId !== null) as Array<{ siteId: number; organizationId: string }>;
    } catch (error) {
      this.logger.error(error as Error, `Error getting all sites`);
      return [];
    }
  }

  /**
   * Resolves an organization's best subscription (custom plan / override / Stripe / AppSumo / free).
   */
  private async getOrganizationSubscriptionInfo(
    orgData: {
      id: string;
      stripeCustomerId: string | null;
      createdAt: string;
      name: string;
    },
    stripeSubscriptions: Map<string, Stripe.Subscription>
  ): Promise<SubscriptionInfo> {
    // Resolve this org's Stripe subscription from the bulk snapshot (no per-org Stripe call),
    // then layer in custom plan / override / AppSumo via the same priority rules as elsewhere.
    const stripeSub = stripeSubscriptionInfoFromSnapshot(stripeSubscriptions, orgData.stripeCustomerId);
    const subscription = await getBestSubscriptionFromStripeSub(orgData.id, stripeSub);

    // Log subscription details
    if (subscription.source === "appsumo") {
      this.logger.info(
        `Organization ${orgData.name} using AppSumo ${subscription.planName} with ${subscription.eventLimit} events/month`
      );
    } else if (subscription.source === "stripe") {
      this.logger.info(
        `Organization ${orgData.name} using Stripe ${subscription.planName} (${subscription.interval}) with ${subscription.eventLimit} events/month`
      );
    } else {
      this.logger.info(`Organization ${orgData.name} on free tier with ${subscription.eventLimit} events/month`);
    }

    return subscription;
  }

  /**
   * Gets monthly event counts for all sites in a single query (for current month)
   * Returns a map of site_id -> event count
   */
  private async getAllSiteEventCounts(): Promise<Map<number, number>> {
    try {
      const periodStart = this.getStartOfMonth();

      const result = await clickhouse.query({
        query: `
          SELECT
            site_id,
            COUNT(*) as count
          FROM events
          WHERE type IN {types:Array(String)}
            AND timestamp >= toDate({periodStart:String})
          GROUP BY site_id
        `,
        format: "JSONEachRow",
        query_params: {
          periodStart: periodStart,
          types: [...USAGE_COUNTED_EVENT_TYPES],
        },
      });

      const rows = await processResults<{ site_id: number; count: string }>(result);

      const eventCountMap = new Map<number, number>();
      for (const row of rows) {
        eventCountMap.set(row.site_id, parseInt(row.count, 10));
      }

      return eventCountMap;
    } catch (error) {
      this.logger.error(error as Error, "Error querying ClickHouse for event counts");
      return new Map();
    }
  }

  /**
   * Gets monthly session replay counts for all sites in a single query (for current month).
   * The metadata table is a ReplacingMergeTree keyed by (site_id, session_id), so uniq
   * dedupes the multiple rows written per session before merges run.
   * Returns a map of site_id -> replay count; empty on failure so quota enforcement fails open.
   */
  private async getAllSiteReplayCounts(): Promise<Map<number, number>> {
    try {
      const periodStart = this.getStartOfMonth();

      const result = await clickhouse.query({
        query: `
          SELECT
            site_id,
            uniq(session_id) as count
          FROM session_replay_metadata
          WHERE start_time >= toDate({periodStart:String})
          GROUP BY site_id
        `,
        format: "JSONEachRow",
        query_params: {
          periodStart: periodStart,
        },
      });

      const rows = await processResults<{ site_id: number; count: string }>(result);

      const replayCountMap = new Map<number, number>();
      for (const row of rows) {
        replayCountMap.set(row.site_id, parseInt(String(row.count), 10));
      }

      return replayCountMap;
    } catch (error) {
      this.logger.error(error as Error, "Error querying ClickHouse for replay counts");
      return new Map();
    }
  }

  /**
   * Updates monthly event usage for all organizations
   */
  public async updateOrganizationsMonthlyUsage(): Promise<void> {
    this.logger.info("Starting check of monthly event usage for organizations...");

    try {
      // Step 0: Pull every customer's subscription from Stripe in one bulk pass (a handful of
      // paginated calls) instead of one call per org. If this fails (e.g. rate limit/outage),
      // skip the whole run rather than treating every paying org as free — which would wrongly
      // flag them over-limit, block ingestion, and email their owners.
      let stripeSubscriptions: Map<string, Stripe.Subscription>;
      try {
        stripeSubscriptions = await getAllStripeSubscriptionsByCustomer();
      } catch (error) {
        this.logger.error(error as Error, "Skipping usage check: failed to fetch Stripe subscriptions in bulk");
        return;
      }

      // Step 1: Get all sites with their organization IDs
      const allSites = await this.getAllSites();

      // Step 2: Get event and replay counts for all sites (current month, one query each)
      const [eventCountMap, replayCountMap] = await Promise.all([
        this.getAllSiteEventCounts(),
        this.getAllSiteReplayCounts(),
      ]);

      // Step 3: Build a map of organizationId -> { siteIds, eventCount, replayCount }
      const orgDataMap = new Map<string, { siteIds: number[]; eventCount: number; replayCount: number }>();
      for (const site of allSites) {
        const orgData = orgDataMap.get(site.organizationId) || { siteIds: [], eventCount: 0, replayCount: 0 };
        orgData.siteIds.push(site.siteId);
        orgData.eventCount += eventCountMap.get(site.siteId) || 0;
        orgData.replayCount += replayCountMap.get(site.siteId) || 0;
        orgDataMap.set(site.organizationId, orgData);
      }

      // Step 4: Get all organizations
      const organizations = await db
        .select({
          id: organization.id,
          name: organization.name,
          stripeCustomerId: organization.stripeCustomerId,
          createdAt: organization.createdAt,
          overMonthlyLimit: organization.overMonthlyLimit,
          approachingLimitNotifiedPeriodStart: organization.approachingLimitNotifiedPeriodStart,
        })
        .from(organization);

      const monthStart = this.getStartOfMonth();
      const now = DateTime.now();
      const totalDaysInMonth = now.daysInMonth ?? 30;
      const daysElapsed = now.diff(now.startOf("month"), "days").days;
      const daysRemaining = totalDaysInMonth - daysElapsed;

      // Step 5: Process each organization
      for (const orgData of organizations) {
        try {
          const orgStats = orgDataMap.get(orgData.id);
          const eventCount = orgStats?.eventCount || 0;
          const siteIds = orgStats?.siteIds || [];

          const wasOverLimit = orgData.overMonthlyLimit ?? false;
          const alreadyNotifiedApproaching = orgData.approachingLimitNotifiedPeriodStart === monthStart;

          const subscription = await this.getOrganizationSubscriptionInfo(orgData, stripeSubscriptions);
          const eventLimit = subscription.eventLimit;
          const isOverLimit = eventCount > eventLimit;

          const replayCount = orgStats?.replayCount || 0;
          const replayBlocked = !subscriptionIncludesReplay(subscription) || replayCount >= getReplayLimit(subscription);

          let sendApproaching = false;
          if (!alreadyNotifiedApproaching && !isOverLimit && Number.isFinite(eventLimit) && daysRemaining >= 2) {
            const projected = daysElapsed >= 1 ? eventCount * (totalDaysInMonth / daysElapsed) : 0;
            const trigger90 = eventCount >= eventLimit * 0.9;
            const triggerProjection = daysElapsed >= 7 && projected >= eventLimit;
            sendApproaching = trigger90 || triggerProjection;
          }

          // Update organization's monthlyEventCount and overMonthlyLimit fields
          await db
            .update(organization)
            .set({
              monthlyEventCount: eventCount,
              overMonthlyLimit: isOverLimit,
              ...(sendApproaching ? { approachingLimitNotifiedPeriodStart: monthStart } : {}),
            })
            .where(eq(organization.id, orgData.id));

          // Send email notification if transitioning from under limit to over limit
          if (isOverLimit && !wasOverLimit) {
            const ownerEmails = await this.getOrganizationOwnerEmails(orgData.id);

            // Send email to all owners if found
            if (ownerEmails.length > 0) {
              for (const ownerEmail of ownerEmails) {
                try {
                  await sendLimitExceededEmail(ownerEmail, orgData.name, eventCount, eventLimit);
                  this.logger.info(`Sent limit exceeded email to owner ${ownerEmail} for organization ${orgData.name}`);
                } catch (error) {
                  this.logger.error(
                    error as Error,
                    `Failed to send limit exceeded email to owner ${ownerEmail} for organization ${orgData.name}`
                  );
                }
              }
            } else {
              this.logger.warn(`No owners found for organization ${orgData.name}, skipping limit exceeded email`);
            }
          }

          if (sendApproaching) {
            const ownerEmails = await this.getOrganizationOwnerEmails(orgData.id);
            if (ownerEmails.length > 0) {
              for (const ownerEmail of ownerEmails) {
                try {
                  await sendApproachingLimitEmail(ownerEmail, orgData.name, eventCount, eventLimit);
                  this.logger.info(
                    `Sent approaching-limit email to owner ${ownerEmail} for organization ${orgData.name}`
                  );
                } catch (error) {
                  this.logger.error(
                    error as Error,
                    `Failed to send approaching-limit email to owner ${ownerEmail} for organization ${orgData.name}`
                  );
                }
              }
            } else {
              this.logger.warn(`No owners found for organization ${orgData.name}, skipping approaching-limit email`);
            }
          }

          // If over the limit, add all this organization's sites to the global set
          if (isOverLimit) {
            for (const siteId of siteIds) {
              this.sitesOverLimit.add(siteId);
            }
            this.logger.info(
              `Organization ${orgData.name} is over limit. Added ${siteIds.length} sites to blocked list.`
            );
          } else {
            for (const siteId of siteIds) {
              this.sitesOverLimit.delete(siteId);
            }
          }

          // Track sites that shouldn't record session replays — plan doesn't include
          // them (e.g. after a downgrade from Pro) or the monthly quota is exhausted —
          // so ingest/config endpoints can stop recording for them
          for (const siteId of siteIds) {
            if (replayBlocked) {
              this.sitesWithoutReplay.add(siteId);
            } else {
              this.sitesWithoutReplay.delete(siteId);
            }
          }

          this.logger.info(
            `Updated organization ${orgData.name}: ${eventCount.toLocaleString()} events, limit ${eventLimit.toLocaleString()}`
          );
        } catch (error) {
          this.logger.error(error as Error, `Error processing organization ${orgData.id}`);
        }
      }

      this.logger.info(
        `Completed monthly event usage check. ${this.sitesOverLimit.size} sites are over their limit, ` +
          `${this.sitesWithoutReplay.size} sites lack session replay access.`
      );

      // Notify listeners (e.g., cluster primary broadcasts to workers)
      for (const callback of this.onUsageUpdatedCallbacks) {
        callback();
      }
    } catch (error) {
      this.logger.error(error as Error, "Error updating monthly usage");
    }
  }

  /**
   * Method to start the usage check cron job
   */
  public startUsageCheckCron() {
    this.initializeUsageCheckCron();
  }

  /**
   * Method to stop the usage check cron job (useful for graceful shutdown)
   */
  public stopUsageCheckCron() {
    if (this.usageCheckTask) {
      this.usageCheckTask.stop();
      this.logger.info("Monthly usage check cron stopped");
    }
  }
}

// Create a singleton instance
export const usageService = new UsageService();
