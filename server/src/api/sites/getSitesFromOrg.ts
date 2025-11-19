import { eq, and } from "drizzle-orm";
import { FastifyRequest, FastifyReply } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites, member, organization } from "../../db/postgres/schema.js";
import { getSessionFromReq, getIsUserAdmin } from "../../lib/auth-utils.js";
import { IS_CLOUD, DEFAULT_EVENT_LIMIT } from "../../lib/const.js";
import { processResults } from "../analytics/utils.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

export async function getSitesFromOrg(
  req: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Querystring: {
      includeMetrics?: string;
      timePeriod?: string; // 24h, 7d, 30d
    };
  }>,
  res: FastifyReply
) {
  try {
    const { organizationId } = req.params;
    const { includeMetrics, timePeriod = "24h" } = req.query;
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

    // Determine time intervals based on period
    let currentInterval = "1 DAY";
    let previousInterval = "2 DAY";

    if (timePeriod === "7d") {
      currentInterval = "7 DAY";
      previousInterval = "14 DAY";
    } else if (timePeriod === "30d") {
      currentInterval = "30 DAY";
      previousInterval = "60 DAY";
    }

    // Query session counts and comprehensive metrics for the sites
    const sessionCountMap = new Map<number, number>();
    const metricsMap = new Map<number, any>();
    const previousMetricsMap = new Map<number, any>();

    if (sitesData.length > 0) {
      const siteIds = sitesData.map(site => site.siteId);

      // Basic session counts query (always included)
      const sessionCountsResult = await clickhouse.query({
        query: `
          SELECT
            site_id,
            uniqExact(session_id) AS total_sessions
          FROM events
          WHERE timestamp >= now() - INTERVAL ${currentInterval}
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

      // If detailed metrics are requested, fetch comprehensive overview data
      if (includeMetrics === "true") {
        // Current period metrics
        const metricsResult = await clickhouse.query({
          query: `
            WITH
            AllSessionPageviews AS (
              SELECT
                site_id,
                session_id,
                COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS total_pageviews_in_session
              FROM events
              WHERE
                site_id IN (${siteIds.join(",")})
                AND timestamp >= now() - INTERVAL ${currentInterval}
              GROUP BY site_id, session_id
            ),
            SessionStats AS (
              SELECT
                site_id,
                session_id,
                MIN(timestamp) AS start_time,
                MAX(timestamp) AS end_time,
                total_pageviews_in_session
              FROM events e
              LEFT JOIN AllSessionPageviews asp USING (site_id, session_id)
              WHERE
                site_id IN (${siteIds.join(",")})
                AND timestamp >= now() - INTERVAL ${currentInterval}
              GROUP BY site_id, session_id, total_pageviews_in_session
            )
            SELECT
              site_id,
              COUNT(DISTINCT session_id) AS sessions,
              COUNT(DISTINCT CASE WHEN type = 'pageview' THEN session_id END) AS pageview_sessions,
              uniqExact(user_id) AS users,
              countIf(type = 'pageview') AS pageviews,
              AVG(total_pageviews_in_session) AS pages_per_session,
              sumIf(1, total_pageviews_in_session = 1) / COUNT(DISTINCT session_id) * 100 AS bounce_rate,
              AVG(end_time - start_time) AS session_duration
            FROM events e
            LEFT JOIN SessionStats ss USING (site_id, session_id)
            WHERE
              site_id IN (${siteIds.join(",")})
              AND timestamp >= now() - INTERVAL ${currentInterval}
            GROUP BY site_id
          `,
          format: "JSONEachRow",
        });
        const metrics = await processResults(metricsResult);

        if (Array.isArray(metrics)) {
          metrics.forEach((row: any) => {
            if (row && typeof row.site_id === "number") {
              metricsMap.set(Number(row.site_id), {
                users: Number(row.users) || 0,
                pageviews: Number(row.pageviews) || 0,
                bounceRate: Number(row.bounce_rate) || 0,
                sessionDuration: Number(row.session_duration) || 0,
                pagesPerSession: Number(row.pages_per_session) || 0,
              });
            }
          });
        }

        // Previous period metrics for comparison
        const previousMetricsResult = await clickhouse.query({
          query: `
            WITH
            AllSessionPageviews AS (
              SELECT
                site_id,
                session_id,
                COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS total_pageviews_in_session
              FROM events
              WHERE
                site_id IN (${siteIds.join(",")})
                AND timestamp >= now() - INTERVAL ${previousInterval}
                AND timestamp < now() - INTERVAL ${currentInterval}
              GROUP BY site_id, session_id
            ),
            SessionStats AS (
              SELECT
                site_id,
                session_id,
                MIN(timestamp) AS start_time,
                MAX(timestamp) AS end_time,
                total_pageviews_in_session
              FROM events e
              LEFT JOIN AllSessionPageviews asp USING (site_id, session_id)
              WHERE
                site_id IN (${siteIds.join(",")})
                AND timestamp >= now() - INTERVAL ${previousInterval}
                AND timestamp < now() - INTERVAL ${currentInterval}
              GROUP BY site_id, session_id, total_pageviews_in_session
            )
            SELECT
              site_id,
              COUNT(DISTINCT session_id) AS sessions,
              uniqExact(user_id) AS users,
              countIf(type = 'pageview') AS pageviews,
              AVG(total_pageviews_in_session) AS pages_per_session,
              sumIf(1, total_pageviews_in_session = 1) / COUNT(DISTINCT session_id) * 100 AS bounce_rate,
              AVG(end_time - start_time) AS session_duration
            FROM events e
            LEFT JOIN SessionStats ss USING (site_id, session_id)
            WHERE
              site_id IN (${siteIds.join(",")})
              AND timestamp >= now() - INTERVAL ${previousInterval}
              AND timestamp < now() - INTERVAL ${currentInterval}
            GROUP BY site_id
          `,
          format: "JSONEachRow",
        });
        const previousMetrics = await processResults(previousMetricsResult);

        if (Array.isArray(previousMetrics)) {
          previousMetrics.forEach((row: any) => {
            if (row && typeof row.site_id === "number") {
              previousMetricsMap.set(Number(row.site_id), {
                users: Number(row.users) || 0,
                pageviews: Number(row.pageviews) || 0,
                sessions: Number(row.sessions) || 0,
                bounceRate: Number(row.bounce_rate) || 0,
                sessionDuration: Number(row.session_duration) || 0,
                pagesPerSession: Number(row.pages_per_session) || 0,
              });
            }
          });
        }
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

    // Helper function to calculate percentage change
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Enhance sites data with session counts and optional metrics
    const enhancedSitesData = sitesData.map(site => {
      const siteId = site.siteId;
      const sessions = sessionCountMap.get(siteId) || 0;
      const currentMetrics = metricsMap.get(siteId);
      const previousMetrics = previousMetricsMap.get(siteId);

      const baseData = {
        ...site,
        sessionsLast24Hours: sessions,
        isOwner: memberCheck[0]?.role !== "member",
      };

      // Only include metrics if requested
      if (includeMetrics === "true" && currentMetrics) {
        return {
          ...baseData,
          metrics: {
            users: currentMetrics.users,
            pageviews: currentMetrics.pageviews,
            bounceRate: currentMetrics.bounceRate,
            sessionDuration: currentMetrics.sessionDuration,
            pagesPerSession: currentMetrics.pagesPerSession,
            sessions: sessions,
            // Calculate changes compared to previous period
            usersChange: previousMetrics ? calculateChange(currentMetrics.users, previousMetrics.users) : 0,
            pageviewsChange: previousMetrics ? calculateChange(currentMetrics.pageviews, previousMetrics.pageviews) : 0,
            sessionsChange: previousMetrics ? calculateChange(sessions, previousMetrics.sessions) : 0,
            bounceRateChange: previousMetrics ? calculateChange(currentMetrics.bounceRate, previousMetrics.bounceRate) : 0,
            sessionDurationChange: previousMetrics
              ? calculateChange(currentMetrics.sessionDuration, previousMetrics.sessionDuration)
              : 0,
            pagesPerSessionChange: previousMetrics
              ? calculateChange(currentMetrics.pagesPerSession, previousMetrics.pagesPerSession)
              : 0,
          },
        };
      }

      return baseData;
    });

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
