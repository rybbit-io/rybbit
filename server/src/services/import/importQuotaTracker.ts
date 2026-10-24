import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites, organization } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { processResults } from "../../api/analytics/utils/utils.js";
import { getBestSubscription, type SubscriptionInfo } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { importQuotaReserve } from "../../db/redis/redis.js";

const logger = createServiceLogger("import-quota");

// How long an organization's shared quota counts live in Redis after its last batch. It must
// outlast a cached tracker (see importQuotaManager): when the counts expire, a new tracker
// reseeds them from ClickHouse, which by then holds every event reserved before.
export const IMPORT_QUOTA_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Get the number of months of historical data allowed for import based on subscription tier
 */
function getHistoricalWindowMonths(subscription: SubscriptionInfo): number {
  if (subscription.source === "free") {
    return 6;
  }

  if (subscription.source === "appsumo") {
    return 24;
  }

  if (subscription.source === "stripe") {
    if (subscription.planName.startsWith("pro")) {
      return 60;
    }
    return 24;
  }

  return 6;
}

export class ImportQuotaTracker {
  private monthlyUsage: Map<string, number>;
  private readonly monthlyLimit: number;
  private readonly oldestAllowedMonth: string;
  // Keys the shared Redis counts; null keeps all accounting in this process.
  private readonly organizationId: string | null;

  private constructor(
    monthlyUsage: Map<string, number>,
    monthlyLimit: number,
    oldestAllowedMonth: string,
    organizationId: string | null = null
  ) {
    this.monthlyUsage = monthlyUsage;
    this.monthlyLimit = monthlyLimit;
    this.oldestAllowedMonth = oldestAllowedMonth;
    this.organizationId = organizationId;
  }

  static async create(organizationId: string): Promise<ImportQuotaTracker> {
    if (!IS_CLOUD) {
      return new ImportQuotaTracker(new Map(), Infinity, "190001");
    }

    const [org] = await db
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const subscription = await getBestSubscription(organizationId, org.stripeCustomerId);

    const monthlyLimit = subscription.eventLimit;
    const historicalWindowMonths = getHistoricalWindowMonths(subscription);

    const oldestAllowedDate = DateTime.utc().minus({ months: historicalWindowMonths }).startOf("month");
    const oldestAllowedMonth = oldestAllowedDate.toFormat("yyyyMM");

    const siteRecords = await db
      .select({ siteId: sites.siteId })
      .from(sites)
      .where(eq(sites.organizationId, organizationId));

    const siteIds = siteRecords.map(s => s.siteId);

    if (siteIds.length === 0) {
      return new ImportQuotaTracker(new Map(), monthlyLimit, oldestAllowedMonth, organizationId);
    }

    const monthlyUsage = await ImportQuotaTracker.queryMonthlyUsage(siteIds, oldestAllowedDate.toFormat("yyyy-MM-dd"));

    return new ImportQuotaTracker(monthlyUsage, monthlyLimit, oldestAllowedMonth, organizationId);
  }

  private static async queryMonthlyUsage(siteIds: number[], startDate: string): Promise<Map<string, number>> {
    const monthlyUsage = new Map<string, number>();

    if (siteIds.length === 0) {
      return monthlyUsage;
    }

    const grandfatheredSites = siteIds.filter(id => id < 2000);
    const newSites = siteIds.filter(id => id >= 2000);

    try {
      // Combine queries into a single UNION query for better performance
      // Grandfathered sites (< 2000): count pageviews only
      // New sites (>= 2000): count pageviews, custom_events, and performance events
      const result = await clickhouse.query({
        query: `
          SELECT
            toYYYYMM(timestamp) as month,
            SUM(count) as count
          FROM (
            ${
              grandfatheredSites.length > 0
                ? `
              SELECT
                timestamp,
                1 as count
              FROM events
              WHERE site_id IN {grandfatheredSites:Array(Int32)}
                AND type = 'pageview'
                AND timestamp >= toDate({startDate:String})
            `
                : ""
            }
            ${grandfatheredSites.length > 0 && newSites.length > 0 ? "UNION ALL" : ""}
            ${
              newSites.length > 0
                ? `
              SELECT
                timestamp,
                1 as count
              FROM events
              WHERE site_id IN {newSites:Array(Int32)}
                AND type IN ('pageview', 'custom_event', 'performance')
                AND timestamp >= toDate({startDate:String})
            `
                : ""
            }
          )
          GROUP BY month
          ORDER BY month
        `,
        query_params: {
          ...(grandfatheredSites.length > 0 && { grandfatheredSites }),
          ...(newSites.length > 0 && { newSites }),
          startDate: startDate,
        },
        format: "JSONEachRow",
      });

      const rows = await processResults<{ month: string; count: number }>(result);
      for (const row of rows) {
        // processResults turns "202405" into the number 202405; lookups use
        // the "yyyyMM" string, so a numeric key would never match.
        monthlyUsage.set(String(row.month), Number(row.count));
      }

      return monthlyUsage;
    } catch (error) {
      throw new Error(
        `Failed to query monthly usage for quota check: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * The month (yyyyMM) each timestamp counts against, or null when it can't be imported:
   * malformed, in the future, or older than the plan's historical window. Self-hosted
   * (unlimited) has no window, so any past timestamp maps to "".
   */
  private monthsFor(timestamps: string[]): Array<string | null> {
    const now = DateTime.utc();
    const unlimited = this.monthlyLimit === Infinity;

    return timestamps.map(timestamp => {
      // Mappers emit the explicit-UTC ISO form that ClickHouse is given.
      const dt = DateTime.fromISO(timestamp, { zone: "utc", setZone: true });
      if (!dt.isValid || dt > now) return null;
      if (unlimited) return "";

      const month = dt.toFormat("yyyyMM");
      return month < this.oldestAllowedMonth ? null : month;
    });
  }

  private static countPerMonth(months: Array<string | null>): Map<string, number> {
    const counts = new Map<string, number>();
    for (const month of months) {
      if (month !== null) counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return counts;
  }

  /** Indices of the events admitted: the first `granted` events of each month, in batch order. */
  private static admit(months: Array<string | null>, granted: Map<string, number>): number[] {
    const admitted = new Map<string, number>();
    const allowedIndices: number[] = [];

    months.forEach((month, index) => {
      if (month === null) return;
      const count = admitted.get(month) ?? 0;
      if (count < (granted.get(month) ?? 0)) {
        allowedIndices.push(index);
        admitted.set(month, count + 1);
      }
    });

    return allowedIndices;
  }

  private addUsage(granted: Map<string, number>): void {
    for (const [month, grant] of granted) {
      this.monthlyUsage.set(month, (this.monthlyUsage.get(month) ?? 0) + grant);
    }
  }

  /**
   * Check and reserve quota for a batch of events using only this process's accounting.
   * Every month in the batch is granted at most what's left of its limit, all at once,
   * so a batch can't overshoot.
   *
   * With several cluster workers this only sees reservations made on this worker; use
   * reserveBatch, which falls back to this when Redis is unavailable.
   *
   * @param timestamps - Array of event timestamps to check
   * @returns Array of indices indicating which events can be imported
   */
  canImportBatch(timestamps: string[]): number[] {
    const months = this.monthsFor(timestamps);
    const requested = ImportQuotaTracker.countPerMonth(months);
    const granted = new Map<string, number>();

    for (const [month, count] of requested) {
      // Self-hosted: no quota accounting, but malformed and future timestamps are still rejected.
      const remaining = this.monthlyLimit - (this.monthlyUsage.get(month) ?? 0);
      granted.set(month, Math.max(0, Math.min(count, remaining)));
    }

    if (this.monthlyLimit !== Infinity) this.addUsage(granted);
    return ImportQuotaTracker.admit(months, granted);
  }

  /**
   * Check and reserve quota for a batch against the organization's counts in Redis, which
   * every cluster worker shares, so parallel batches can't each spend the same remaining
   * quota. Falls back to this process's accounting if Redis fails, so imports never stall.
   */
  async reserveBatch(timestamps: string[]): Promise<number[]> {
    if (this.monthlyLimit === Infinity || !this.organizationId) {
      return this.canImportBatch(timestamps);
    }

    const months = this.monthsFor(timestamps);
    const requests = [...ImportQuotaTracker.countPerMonth(months)].map(([month, requested]) => ({
      month,
      // ClickHouse usage when this tracker was built plus anything this process has reserved
      // since. The shared count adopts it when higher, e.g. once live traffic has landed.
      baseline: this.monthlyUsage.get(month) ?? 0,
      requested,
    }));
    if (requests.length === 0) return [];

    let grantedCounts: number[];
    try {
      grantedCounts = await importQuotaReserve(
        `import:quota:${this.organizationId}`,
        this.monthlyLimit,
        IMPORT_QUOTA_TTL_MS,
        requests
      );
    } catch (error) {
      logger.warn(
        { err: error, organizationId: this.organizationId },
        "Import quota Redis call failed; using this process's counts"
      );
      return this.canImportBatch(timestamps);
    }

    const granted = new Map(requests.map((request, index) => [request.month, grantedCounts[index]]));
    // Mirror the reservation so the in-process fallback stays close if Redis drops out later.
    this.addUsage(granted);
    return ImportQuotaTracker.admit(months, granted);
  }

  getOldestAllowedMonth(): string {
    return this.oldestAllowedMonth;
  }
}
