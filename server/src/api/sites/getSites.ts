import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member } from "../../db/postgres/schema.js";
import {
  getSitesUserHasAccessTo,
  getUserGodMode,
} from "../../lib/auth-utils.js";
import { IS_CLOUD, DEFAULT_EVENT_LIMIT } from "../../lib/const.js";
import { processResults } from "../analytics/utils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

export async function getSites(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Get sites the user has access to
    const sitesData = await getSitesUserHasAccessTo(req);
    const godMode = await getUserGodMode(req);

    // Only query for session counts if there are sites
    const sessionCountMap = new Map<number, number>();

    if (sitesData.length > 0) {
      // Extract site IDs that the user has access to
      const siteIds = sitesData.map((site) => site.siteId);

      // Query session counts only for the user's sites
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

      // Add session counts to map
      if (Array.isArray(sessionCounts)) {
        sessionCounts.forEach((row: any) => {
          if (
            row &&
            typeof row.site_id === "number" &&
            typeof row.total_sessions === "number"
          ) {
            sessionCountMap.set(Number(row.site_id), row.total_sessions);
          }
        });
      }
    }

    const enhancedSitesData = await Promise.all(
      sitesData.map(async (site) => {
        let isOwner = false;
        let ownerId = "";

        if (!IS_CLOUD) {
          return {
            ...site,
            monthlyEventCount: 0,
            eventLimit: Infinity,
            overMonthlyLimit: false,
            isOwner: true,
            sessionsLast24Hours: sessionCountMap.get(Number(site.siteId)) || 0,
          };
        }
        // Determine ownership if organization ID exists
        if (site.organizationId) {
          const orgOwnerResult = await db
            .select({ userId: member.userId })
            .from(member)
            .where(
              and(
                eq(member.organizationId, site.organizationId),
                eq(member.role, "owner")
              )
            )
            .limit(1);

          if (orgOwnerResult.length > 0) {
            ownerId = orgOwnerResult[0].userId;
            isOwner = ownerId === req.user?.id;
          }
        }

        const subscription = await getSubscriptionInner(ownerId);

        const monthlyEventCount = subscription?.monthlyEventCount || 0;
        const eventLimit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;

        return {
          ...site,
          monthlyEventCount,
          eventLimit,
          overMonthlyLimit: monthlyEventCount > eventLimit,
          isOwner,
          sessionsLast24Hours: sessionCountMap.get(site.siteId) || 0,
        };
      })
    );

    return reply
      .status(200)
      .send(
        enhancedSitesData.sort(
          (a, b) => b.sessionsLast24Hours - a.sessionsLast24Hours
        )
      );
  } catch (err) {
    console.error("Error in getSites:", err);
    return reply.status(500).send(String(err));
  }
}
