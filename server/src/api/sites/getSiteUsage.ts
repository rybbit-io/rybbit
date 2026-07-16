import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD, USAGE_COUNTED_EVENT_TYPES } from "../../lib/const.js";
import { processResults } from "../analytics/utils/utils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

const getSiteUsageRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
    }),
  })
  .strict();

type GetSiteUsageRequest = {
  Params: z.infer<typeof getSiteUsageRequestSchema.shape.params>;
};

export type SiteUsageResponse = {
  periodStart: string;
  daysInMonth: number;
  daysElapsed: number;
  siteEventsThisMonth: number;
  orgEventsThisMonth: number;
  /** null when self-hosted (no enforced limit) */
  orgEventLimit: number | null;
  /** Month-end projections from usage so far; null in the first day of the month */
  projectedSiteEvents: number | null;
  projectedOrgEvents: number | null;
};

/**
 * Per-site usage for the current billing period (calendar month, matching the
 * usage cron in usageService). Counts events live from ClickHouse for every
 * site in the owning organization so the site's share of org usage is exact.
 */
export async function getSiteUsage(request: FastifyRequest<GetSiteUsageRequest>, reply: FastifyReply) {
  try {
    const parsed = getSiteUsageRequestSchema.safeParse({ params: request.params });
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }
    const { siteId } = parsed.data.params;

    const [site] = await db
      .select({ organizationId: sites.organizationId })
      .from(sites)
      .where(eq(sites.siteId, siteId))
      .limit(1);

    if (!site?.organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const orgSites = await db
      .select({ siteId: sites.siteId })
      .from(sites)
      .where(eq(sites.organizationId, site.organizationId));
    const orgSiteIds = orgSites.map(s => s.siteId);

    const now = DateTime.now();
    const periodStart = now.startOf("month").toISODate() as string;

    const result = await clickhouse.query({
      query: `
        SELECT
          site_id,
          COUNT(*) as count
        FROM events
        WHERE site_id IN {siteIds:Array(UInt16)}
          AND type IN {types:Array(String)}
          AND timestamp >= toDate({periodStart:String})
        GROUP BY site_id
      `,
      format: "JSONEachRow",
      query_params: {
        siteIds: orgSiteIds,
        types: [...USAGE_COUNTED_EVENT_TYPES],
        periodStart,
      },
    });
    const rows = await processResults<{ site_id: number; count: string }>(result);

    let siteEventsThisMonth = 0;
    let orgEventsThisMonth = 0;
    for (const row of rows) {
      const count = parseInt(String(row.count), 10);
      orgEventsThisMonth += count;
      if (Number(row.site_id) === siteId) {
        siteEventsThisMonth = count;
      }
    }

    const daysInMonth = now.daysInMonth ?? 30;
    const daysElapsed = now.diff(now.startOf("month"), "days").days;
    // Too little data in the first day of a month to extrapolate meaningfully
    const projectionFactor = daysElapsed >= 1 ? daysInMonth / daysElapsed : null;

    let orgEventLimit: number | null = null;
    if (IS_CLOUD) {
      const subscription = await getSubscriptionInner(site.organizationId);
      orgEventLimit = subscription?.eventLimit ?? null;
    }

    const response: SiteUsageResponse = {
      periodStart,
      daysInMonth,
      daysElapsed,
      siteEventsThisMonth,
      orgEventsThisMonth,
      orgEventLimit,
      projectedSiteEvents: projectionFactor === null ? null : Math.round(siteEventsThisMonth * projectionFactor),
      projectedOrgEvents: projectionFactor === null ? null : Math.round(orgEventsThisMonth * projectionFactor),
    };

    return reply.send(response);
  } catch (error) {
    console.error("Error fetching site usage:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
