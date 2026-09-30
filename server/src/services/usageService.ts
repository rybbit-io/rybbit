import cluster from "node:cluster";
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
  getBestSubscription,
  getBestSubscriptionFromStripeSub,
  getReplayLimit,
  invalidateStripeSubscriptionCache,
  siteRequiresPlan,
  stripeSubscriptionInfoFromSnapshot,
  subscriptionIncludesReplay,
  SubscriptionInfo,
} from "../lib/subscriptionUtils.js";

type UsageUpdateCallback = () => void;

type OrgSite = { siteId: number; createdAt: string | null };

// IPC message a worker sends the cluster primary, which owns the blocked-site sets.
export const REFRESH_ORGANIZATION_USAGE_MESSAGE = "refresh-organization-usage";
const REFRESH_RETRY_DELAYS_MS = [0, 15_000, 60_000];

class UsageService {
  private sitesOverLimit = new Set<number>();
  // Sites that collect nothing because their organization has no plan (see siteRequiresPlan):
  // no events, replays or identify calls.
  private sitesWithoutPlan = new Set<number>();
  // Sites that should not record session replays right now: their organization's plan
  // doesn't include replays, or its monthly replay quota is exhausted. Empty until the
  // usage cron runs (and always empty when self-hosted), so enforcement fails open.
  private sitesWithoutReplay = new Set<number>();
  // Replay count per organization from the last cron run, so an on-demand refresh can apply
  // the replay quota without its own ClickHouse query.
  private orgReplayCounts = new Map<string, number>();
  // When each organization was last refreshed on demand. A cron run that started before then
  // holds older subscription data and must not overwrite that organization's blocks.
  private orgRefreshedAt = new Map<string, number>();
  // In-flight refreshes per organization. Refreshes run one after another so an older one
  // (a site create that read "free") can't finish after a newer one (checkout) and undo it.
  private orgRefreshQueue = new Map<string, Promise<void>>();
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
   * Sets the sitesWithoutPlan set (used by workers receiving IPC updates from primary)
   */
  public setSitesWithoutPlan(sites: Set<number>): void {
    this.sitesWithoutPlan = sites;
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
  private isUsageCheckEnabled(): boolean {
    return IS_CLOUD && process.env.NODE_ENV !== "development";
  }

  private initializeUsageCheckCron() {
    if (this.isUsageCheckEnabled()) {
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

      // The blocked-site sets live in memory and start empty, so without a run now an over-limit
      // or plan-less site would collect for up to 30 minutes after every restart or deploy.
      this.updateOrganizationsMonthlyUsage().catch(error => {
        this.logger.error(error as Error, "Error during startup usage check");
      });
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

  public getSitesWithoutPlan(): Set<number> {
    return this.sitesWithoutPlan;
  }

  /**
   * Checks if a site collects nothing until its organization starts a plan
   */
  public isSiteWithoutPlan(siteId: number): boolean {
    return this.sitesWithoutPlan.has(siteId);
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
      this.logger.error({ err: error, organizationId }, "Error getting organization owner emails");
      return [];
    }
  }

  /**
   * Gets all sites with their organization IDs (excludes sites without an organization)
   */
  private async getAllSites(): Promise<Array<OrgSite & { organizationId: string }>> {
    try {
      const allSites = await db
        .select({
          siteId: sites.siteId,
          organizationId: sites.organizationId,
          createdAt: sites.createdAt,
        })
        .from(sites);

      // Filter out sites without an organization ID
      return allSites.filter(site => site.organizationId !== null) as Array<OrgSite & { organizationId: string }>;
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
    // A failed plan lookup throws, so the caller skips this org and keeps its current blocks
    // instead of treating a paying organization as free.
    const subscription = await getBestSubscriptionFromStripeSub(orgData.id, stripeSub, { throwOnError: true });

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
          FROM session_replay_metadata_v2
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
    const runStartedAt = Date.now();

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

      // Step 3: Build a map of organizationId -> { sites, eventCount, replayCount }
      const orgDataMap = new Map<string, { sites: OrgSite[]; eventCount: number; replayCount: number }>();
      for (const site of allSites) {
        const orgData = orgDataMap.get(site.organizationId) || { sites: [], eventCount: 0, replayCount: 0 };
        orgData.sites.push({ siteId: site.siteId, createdAt: site.createdAt });
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
          const orgSites = orgStats?.sites || [];

          const wasOverLimit = orgData.overMonthlyLimit ?? false;
          const alreadyNotifiedApproaching = orgData.approachingLimitNotifiedPeriodStart === monthStart;

          const subscription = await this.getOrganizationSubscriptionInfo(orgData, stripeSubscriptions);
          if (this.refreshedSince(orgData.id, runStartedAt)) continue;
          const eventLimit = subscription.eventLimit;
          const isOverLimit = eventCount > eventLimit;

          const replayCount = orgStats?.replayCount || 0;
          this.orgReplayCounts.set(orgData.id, replayCount);

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
                  this.logger.info({ organizationId: orgData.id }, "Sent limit-exceeded email to organization owner");
                } catch (error) {
                  this.logger.error(
                    { err: error, organizationId: orgData.id },
                    "Failed to send limit-exceeded email to organization owner"
                  );
                }
              }
            } else {
              this.logger.warn(
                { organizationId: orgData.id },
                "No organization owners found; skipping limit-exceeded email"
              );
            }
          }

          if (sendApproaching) {
            const ownerEmails = await this.getOrganizationOwnerEmails(orgData.id);
            if (ownerEmails.length > 0) {
              for (const ownerEmail of ownerEmails) {
                try {
                  await sendApproachingLimitEmail(ownerEmail, orgData.name, eventCount, eventLimit);
                  this.logger.info(
                    { organizationId: orgData.id },
                    "Sent approaching-limit email to organization owner"
                  );
                } catch (error) {
                  this.logger.error(
                    { err: error, organizationId: orgData.id },
                    "Failed to send approaching-limit email to organization owner"
                  );
                }
              }
            } else {
              this.logger.warn(
                { organizationId: orgData.id },
                "No organization owners found; skipping approaching-limit email"
              );
            }
          }

          // The emails above awaited; a refresh may have landed with newer data meanwhile.
          if (this.refreshedSince(orgData.id, runStartedAt)) continue;

          const withoutPlanCount = this.applySiteBlocks(orgSites, subscription, isOverLimit, replayCount);
          if (isOverLimit) {
            this.logger.info(
              `Organization ${orgData.name} is over limit. Added ${orgSites.length} sites to blocked list.`
            );
          }
          if (withoutPlanCount > 0) {
            this.logger.info(
              `Organization ${orgData.name} has no plan. Blocked ${withoutPlanCount} sites until it starts one.`
            );
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
          `${this.sitesWithoutPlan.size} sites have no plan, ` +
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

  private refreshedSince(organizationId: string, time: number): boolean {
    return (this.orgRefreshedAt.get(organizationId) ?? 0) > time;
  }

  /**
   * Sets each of an organization's sites' blocks from its subscription: events dropped when the
   * organization is over its limit, everything dropped when the site needs a plan, and replays
   * dropped when the plan excludes them (e.g. after a downgrade from Pro) or the monthly replay
   * quota is used up. Returns how many sites need a plan.
   */
  private applySiteBlocks(
    orgSites: OrgSite[],
    subscription: SubscriptionInfo,
    isOverLimit: boolean,
    replayCount: number
  ): number {
    const replayBlocked = !subscriptionIncludesReplay(subscription) || replayCount >= getReplayLimit(subscription);
    let withoutPlanCount = 0;
    for (const site of orgSites) {
      if (isOverLimit) this.sitesOverLimit.add(site.siteId);
      else this.sitesOverLimit.delete(site.siteId);

      if (siteRequiresPlan(subscription, site.createdAt)) {
        this.sitesWithoutPlan.add(site.siteId);
        withoutPlanCount++;
      } else {
        this.sitesWithoutPlan.delete(site.siteId);
      }

      if (replayBlocked) this.sitesWithoutReplay.add(site.siteId);
      else this.sitesWithoutReplay.delete(site.siteId);
    }
    return withoutPlanCount;
  }

  /**
   * Re-evaluates one organization's site blocks now instead of at the next cron run (up to 30
   * minutes away): a new site in an organization with no plan must stop collecting straight
   * away, and a trial that just started must start it. Uses the event and replay counts from
   * the last cron run. Throws if the plan can't be resolved, leaving the blocks as they were.
   */
  public refreshOrganization(organizationId: string): Promise<void> {
    const previous = this.orgRefreshQueue.get(organizationId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => this.refreshOrganizationNow(organizationId));
    this.orgRefreshQueue.set(organizationId, next);
    const forget = () => {
      if (this.orgRefreshQueue.get(organizationId) === next) this.orgRefreshQueue.delete(organizationId);
    };
    next.then(forget, forget);
    return next;
  }

  private async refreshOrganizationNow(organizationId: string): Promise<void> {
    const [org] = await db
      .select({ stripeCustomerId: organization.stripeCustomerId, monthlyEventCount: organization.monthlyEventCount })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!org) return;

    // This process's cached subscription may predate the checkout or cancellation that
    // triggered the refresh.
    invalidateStripeSubscriptionCache(org.stripeCustomerId);
    const subscription = await getBestSubscription(organizationId, org.stripeCustomerId, { throwOnLookupError: true });

    const orgSites = await db
      .select({ siteId: sites.siteId, createdAt: sites.createdAt })
      .from(sites)
      .where(eq(sites.organizationId, organizationId));

    const isOverLimit = (org.monthlyEventCount ?? 0) > subscription.eventLimit;
    this.applySiteBlocks(orgSites, subscription, isOverLimit, this.orgReplayCounts.get(organizationId) ?? 0);
    this.orgRefreshedAt.set(organizationId, Date.now());

    for (const callback of this.onUsageUpdatedCallbacks) {
      callback();
    }
  }

  /**
   * refreshOrganization with a couple of retries, for callers that can't wait on it (webhooks
   * already acknowledged, sites already created). If every attempt fails, the next cron run
   * reconciles the organization.
   */
  public async refreshOrganizationWithRetry(organizationId: string): Promise<void> {
    for (const delayMs of REFRESH_RETRY_DELAYS_MS) {
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
      try {
        await this.refreshOrganization(organizationId);
        return;
      } catch (error) {
        this.logger.warn({ err: error, organizationId }, "Refreshing organization usage failed");
      }
    }
    this.logger.error({ organizationId }, "Gave up refreshing organization usage; the next usage check will reconcile it");
  }

  /**
   * Asks the process that owns the blocked-site sets to refresh an organization: the cluster
   * primary when this is a worker, otherwise this process. Never throws, so callers can fire
   * it after a request has already succeeded.
   */
  public requestOrganizationRefresh(organizationId: string | null | undefined): void {
    if (!organizationId || !this.isUsageCheckEnabled()) return;

    if (cluster.isWorker) {
      process.send?.({ type: REFRESH_ORGANIZATION_USAGE_MESSAGE, organizationId });
      return;
    }

    void this.refreshOrganizationWithRetry(organizationId);
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
