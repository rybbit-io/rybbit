import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";
import SqlString from "sqlstring";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";

type OrgEventCountResponse = {
  event_date: string;
  event_count: number;
}[];

export async function getOrgEventCount(
  req: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Querystring: {
      startDate?: string;
      endDate?: string;
      timeZone?: string;
    };
  }>,
  res: FastifyReply
) {
  const { organizationId } = req.params;
  const { startDate, endDate, timeZone = "UTC" } = req.query;

  try {
    // Get all sites the user has access to
    const userSites = await getSitesUserHasAccessTo(req);

    // Filter to only sites in the requested organization
    const orgSites = userSites.filter(site => site.organizationId === organizationId);

    if (orgSites.length === 0) {
      return res.status(403).send({ error: "No access to organization or no sites found" });
    }

    const siteIds = orgSites.map((site: any) => site.siteId);

    // Build time filter for the query
    let timeFilter = "";
    let fillFromDate = "";
    let fillToDate = "";

    if (startDate && endDate) {
      timeFilter = `AND event_hour >= toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(timeZone)})),
        'UTC'
      )
      AND event_hour < if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(timeZone)}),
        now(),
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(timeZone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;

      // Set up WITH FILL parameters
      fillFromDate = `FROM toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(timeZone)})),
        'UTC'
      )`;

      fillToDate = `TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(timeZone)}),
        toStartOfDay(now()) + INTERVAL 1 DAY,
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(timeZone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;
    } else {
      // Default to last 30 days if no date range provided
      timeFilter = "AND event_hour >= now() - INTERVAL 30 DAY";
      fillFromDate = "FROM now() - INTERVAL 30 DAY";
      fillToDate = "TO now() + INTERVAL 1 DAY";
    }

    const query = `
      SELECT 
        toStartOfDay(event_hour) as event_date,
        SUM(event_count) as event_count
      FROM hourly_events_by_site_mv_target
      WHERE site_id IN (${siteIds.map((id: number) => SqlString.escape(id)).join(", ")})
        ${timeFilter}
      GROUP BY event_date
      ORDER BY event_date
      WITH FILL ${fillFromDate} ${fillToDate} STEP INTERVAL 1 DAY
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
    });

    const data = await processResults<OrgEventCountResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching organization event count:", error);
    return res.status(500).send({ error: "Failed to fetch organization event count" });
  }
}
