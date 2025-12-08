import { eq, and } from "drizzle-orm";
import { FastifyRequest, FastifyReply } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites, member, organization } from "../../db/postgres/schema.js";
import { getSessionFromReq, getIsUserAdmin } from "../../lib/auth-utils.js";
import { IS_CLOUD, DEFAULT_EVENT_LIMIT } from "../../lib/const.js";
import { processResults } from "../analytics/utils/utils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

export async function getSitesFromOrg(
  req: FastifyRequest<{
    Params: {
      organizationId: string;
    };
  }>,
  res: FastifyReply
) {
  try {
    const { organizationId } = req.params;
    const session = await getSessionFromReq(req);
    const userId = session?.user.id;

    if (!userId) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    // Run all database queries concurrently
    const [isOwner, memberCheck, sitesData, orgInfo] = await Promise.all([
      getIsUserAdmin(req),
      db
        .select()
        .from(member)
        .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
        .limit(1),
      db.select().from(sites).where(eq(sites.organizationId, organizationId)),
      db.select().from(organization).where(eq(organization.id, organizationId)).limit(1),
    ]);

    // If not admin, verify user is a member of the organization
    if (!isOwner && memberCheck.length === 0) {
      return res.status(403).send({ error: "Access denied to this organization" });
    }

    // Query session counts for the sites
    const sessionCountMap = new Map<number, number>();

    if (sitesData.length > 0) {
      const siteIds = sitesData.map(site => site.siteId);

      const sessionCountsResult = await clickhouse.query({
        query: `
          SELECT 
            site_id, 
            uniqExact(session_id) AS total_sessions 
          FROM events 
          WHERE timestamp >= now() - INTERVAL 1 DAY 
            AND site_id IN (${siteIds.join(",")})
          GROUP BY site_id
        `,
        format: "JSONEachRow",
      });
      const sessionCounts = await processResults(sessionCountsResult);

      if (Array.isArray(sessionCounts)) {
        sessionCounts.forEach((row: any) => {
          if (row && typeof row.site_id === "number" && typeof row.total_sessions === "number") {
            sessionCountMap.set(Number(row.site_id), row.total_sessions);
          }
        });
      }
    }

    // Get subscription info
    let subscription = null;
    let monthlyEventCount = 0;
    let eventLimit = DEFAULT_EVENT_LIMIT;

    if (!IS_CLOUD) {
      // Self-hosted version has unlimited events
      eventLimit = Infinity;
    } else {
      subscription = await getSubscriptionInner(organizationId);
      monthlyEventCount = subscription?.monthlyEventCount || 0;
      eventLimit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;
    }

    // Enhance sites data with session counts and subscription info
    const enhancedSitesData = sitesData.map(site => ({
      ...site,
      sessionsLast24Hours: sessionCountMap.get(site.siteId) || 0,
      isOwner: memberCheck[0]?.role !== "member",
    }));

    // Sort by sessions descending
    enhancedSitesData.sort((a, b) => b.sessionsLast24Hours - a.sessionsLast24Hours);

    return res.status(200).send({
      organization: orgInfo[0] || null,
      sites: enhancedSitesData,
      subscription: {
        monthlyEventCount,
        eventLimit,
        overMonthlyLimit: monthlyEventCount > eventLimit,
        planName: subscription?.planName || "free",
        status: subscription?.status || "free",
        isPro: subscription?.planName.includes("pro") || false,
      },
    });
  } catch (err) {
    console.error("Error in getSitesFromOrg:", err);
    return res.status(500).send({ error: String(err) });
  }
}
