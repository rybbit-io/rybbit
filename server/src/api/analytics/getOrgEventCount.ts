import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { processResults } from "./utils/utils.js";

type OrgEventCountResponse = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  outbound_count: number;
  error_count: number;
  button_click_count: number;
  copy_count: number;
  form_submit_count: number;
  input_change_count: number;
  event_count: number;
}[];

export async function getOrgEventCount(
  req: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Querystring: {
      start_date?: string;
      end_date?: string;
      time_zone?: string;
    };
  }>,
  res: FastifyReply
) {
  const { organizationId } = req.params;
  const { start_date, end_date, time_zone = "UTC" } = req.query;

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

    if (start_date && end_date) {
      timeFilter = `AND event_hour >= toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)})),
        'UTC'
      )
      AND event_hour < if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        now(),
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;

      // Set up WITH FILL parameters
      fillFromDate = `FROM toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)})),
        'UTC'
      )`;

      fillToDate = `TO if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        toStartOfDay(now()) + INTERVAL 1 DAY,
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;
    } else {
      // No date range: return all data without WITH FILL
      timeFilter = "";
      fillFromDate = "";
      fillToDate = "";
    }

    const query = `
      SELECT
        toStartOfDay(timestamp) as event_date,
        countIf(type = 'pageview') as pageview_count,
        countIf(type = 'custom_event') as custom_event_count,
        countIf(type = 'performance') as performance_count,
        countIf(type = 'outbound') as outbound_count,
        countIf(type = 'error') as error_count,
        countIf(type = 'button_click') as button_click_count,
        countIf(type = 'copy') as copy_count,
        countIf(type = 'form_submit') as form_submit_count,
        countIf(type = 'input_change') as input_change_count,
        count() as event_count
      FROM events
      WHERE site_id IN (${siteIds.map((id: number) => SqlString.escape(id)).join(", ")})
        AND type IN ('pageview', 'custom_event', 'performance', 'outbound', 'error', 'button_click', 'copy', 'form_submit', 'input_change')
        ${timeFilter.replace(/event_hour/g, "timestamp")}
      GROUP BY event_date
      ORDER BY event_date
      ${fillFromDate ? `WITH FILL ${fillFromDate} ${fillToDate} STEP INTERVAL 1 DAY` : ""}
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
