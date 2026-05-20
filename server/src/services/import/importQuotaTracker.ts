import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites, organization } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { processResults } from "../../api/analytics/utils/utils.js";
import { getBestSubscription, type SubscriptionInfo } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

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

  private constructor(monthlyUsage: Map<string, number>, monthlyLimit: number, oldestAllowedMonth: string) {
    this.monthlyUsage = monthlyUsage;
    this.monthlyLimit = monthlyLimit;
    this.oldestAllowedMonth = oldestAllowedMonth;
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
      return new ImportQuotaTracker(new Map(), monthlyLimit, oldestAllowedMonth);
    }

    const monthlyUsage = await ImportQuotaTracker.queryMonthlyUsage(siteIds, oldestAllowedDate.toFormat("yyyy-MM-dd"));

    return new ImportQuotaTracker(monthlyUsage, monthlyLimit, oldestAllowedMonth);
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
        monthlyUsage.set(row.month, row.count);
      }

      return monthlyUsage;
    } catch (error) {
      throw new Error(
        `Failed to query monthly usage for quota check: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Atomically check and reserve quota for a batch of events.
   * This method prevents race conditions by checking all events in a batch
   * and atomically updating usage counts for all months at once.
   *
   * @param timestamps - Array of event timestamps to check
   * @returns Array of indices indicating which events can be imported
   */
  canImportBatch(timestamps: string[]): number[] {
    if (this.monthlyLimit === Infinity) {
      return timestamps.map((_, i) => i);
    }

    const allowedIndices: number[] = [];
    const monthlyIncrements = new Map<string, number>();
    const now = DateTime.utc();

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const dt = DateTime.fromFormat(timestamp, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });

      if (!dt.isValid || dt > now) {
        continue;
      }

      const month = dt.toFormat("yyyyMM");
      if (month < this.oldestAllowedMonth) {
        continue;
      }

      const currentUsage = this.monthlyUsage.get(month) || 0;
      const incrementInBatch = monthlyIncrements.get(month) || 0;
      const totalUsage = currentUsage + incrementInBatch;

      if (totalUsage < this.monthlyLimit) {
        allowedIndices.push(i);
        monthlyIncrements.set(month, incrementInBatch + 1);
      }
    }

    // Atomically apply all increments at once
    for (const [month, increment] of monthlyIncrements) {
      const current = this.monthlyUsage.get(month) || 0;
      this.monthlyUsage.set(month, current + increment);
    }

    return allowedIndices;
  }

  getOldestAllowedMonth(): string {
    return this.oldestAllowedMonth;
  }
}
