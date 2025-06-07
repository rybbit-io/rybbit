import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  getOverviewInputSchema,
  getOverviewOutputSchema,
  type GetOverviewOutput,
} from "../../schemas/analytics.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "../../api/analytics/utils.js";

// Reuse the existing query function from getOverview.ts
const getQuery = ({
  startDate,
  endDate,
  timeZone,
  filters,
  pastMinutesRange,
}: {
  startDate: string;
  endDate: string;
  timeZone: string;
  filters: string;
  pastMinutesRange?: { start: number; end: number };
}) => {
  const timeParams = pastMinutesRange
    ? { pastMinutesRange }
    : { date: { startDate, endDate, timeZone } };

  const filterStatement = getFilterStatement(filters);

  return `SELECT   
      session_stats.sessions,
      session_stats.pages_per_session,
      session_stats.bounce_rate * 100 AS bounce_rate,
      session_stats.session_duration,
      page_stats.pageviews,
      page_stats.users  
    FROM
    (
        -- Session-level metrics
        SELECT
            COUNT() AS sessions,
            AVG(pages_in_session) AS pages_per_session,
            sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
            AVG(end_time - start_time) AS session_duration
        FROM
            (
                -- One row per session
                SELECT
                    session_id,
                    MIN(timestamp) AS start_time,
                    MAX(timestamp) AS end_time,
                    COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pages_in_session
                FROM events
                WHERE
                    site_id = {siteId:Int32}
                    ${filterStatement}
                    ${getTimeStatement(timeParams)}
                GROUP BY session_id
            )
        ) AS session_stats
        CROSS JOIN
        (
            -- Page-level and user-level metrics
            SELECT
                COUNT(*)                   AS pageviews,
                COUNT(DISTINCT user_id)    AS users
            FROM events
            WHERE 
                site_id = {siteId:Int32}
                ${filterStatement}
                ${getTimeStatement(timeParams)}
                AND type = 'pageview'
        ) AS page_stats`;
};

export const analyticsRouter = router({
  getOverview: protectedProcedure
    .input(getOverviewInputSchema)
    .output(getOverviewOutputSchema)
    .query(async ({ input, ctx }) => {
      console.log("[tRPC] getOverview called with input:", input);
      console.log("[tRPC] User context:", ctx.user?.email || "No user");

      const {
        site,
        startDate,
        endDate,
        timeZone,
        filters,
        pastMinutesStart,
        pastMinutesEnd,
      } = input;

      // Reuse existing auth logic with debug logging
      console.log(
        "🔍 DEBUG: tRPC getOverview - site parameter:",
        site,
        "type:",
        typeof site
      );

      const userHasAccess = await getUserHasAccessToSitePublic(ctx.req, site);
      console.log("🔍 DEBUG: tRPC getOverview - userHasAccess:", userHasAccess);

      if (!userHasAccess) {
        console.log(
          "🔍 DEBUG: tRPC getOverview - Access denied for site:",
          site
        );
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const pastMinutesRange =
        pastMinutesStart && pastMinutesEnd
          ? { start: Number(pastMinutesStart), end: Number(pastMinutesEnd) }
          : undefined;

      const query = getQuery({
        startDate,
        endDate,
        timeZone,
        filters,
        pastMinutesRange: pastMinutesRange,
      });

      // Validate and convert site parameter
      console.log("🔍 DEBUG: Converting site to number:", {
        site,
        type: typeof site,
      });

      if (!site || site.trim() === "") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Site parameter is required and cannot be empty",
        });
      }

      const siteId = Number(site);
      console.log("🔍 DEBUG: Converted siteId:", {
        siteId,
        isNaN: isNaN(siteId),
      });

      if (isNaN(siteId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid site ID: "${site}" cannot be converted to a number`,
        });
      }

      try {
        const result = await clickhouse.query({
          query,
          format: "JSONEachRow",
          query_params: {
            siteId: siteId,
          },
        });

        const data = await processResults<GetOverviewOutput>(result);
        console.log("[tRPC] getOverview result:", data[0]);
        return data[0];
      } catch (error) {
        console.error("Error fetching overview:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch overview",
        });
      }
    }),
});
