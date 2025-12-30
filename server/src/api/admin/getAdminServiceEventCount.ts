import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";

type ServiceEventCountResponse = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  event_count: number;
}[];

export async function getAdminServiceEventCount(
  req: FastifyRequest<{
    Querystring: {
      start_date?: string;
      end_date?: string;
      time_zone?: string;
    };
  }>,
  res: FastifyReply
) {
  const isAdmin = await getIsUserAdmin(req);

  if (!isAdmin) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  const { start_date, end_date, time_zone = "UTC" } = req.query;

  try {
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

      // Set up WITH FILL parameters - use UTC midnight boundaries
      fillFromDate = `FROM toStartOfDay(toDateTime(${SqlString.escape(start_date)}))`;

      fillToDate = `TO toStartOfDay(toDateTime(${SqlString.escape(end_date)})) + INTERVAL 1 DAY`;
    } else {
      // Default to last 30 days if no date range provided
      timeFilter = "AND event_hour >= toStartOfDay(now()) - INTERVAL 30 DAY";
      fillFromDate = "FROM toStartOfDay(now()) - INTERVAL 30 DAY";
      fillToDate = "TO toStartOfDay(now()) + INTERVAL 1 DAY";
    }

    const query = `
      SELECT
        toStartOfDay(timestamp) as event_date,
        countIf(type = 'pageview') as pageview_count,
        countIf(type = 'custom_event') as custom_event_count,
        countIf(type = 'performance') as performance_count,
        count() as event_count
      FROM events
      WHERE type IN ('pageview', 'custom_event', 'performance')
        ${timeFilter.replace(/event_hour/g, "timestamp")}
      GROUP BY event_date
      ORDER BY event_date
      WITH FILL ${fillFromDate} ${fillToDate} STEP INTERVAL 1 DAY
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
    });

    const data = await processResults<ServiceEventCountResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching service event count:", error);
    return res.status(500).send({ error: "Failed to fetch service event count" });
  }
}
