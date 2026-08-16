import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { parseTimeWindow, timeWindowFill, timeWindowWhere } from "../analytics/utils/timeWindow.js";
import { processResults } from "../analytics/utils/utils.js";

type ServiceEventCountResponse = {
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

// The 30 calendar days ending today, as seen from `timeZone` — "today" is a
// different date either side of midnight, so the range has to be cut in the
// caller's zone rather than the server's. An unusable zone degrades to UTC;
// the range still has to be a range.
const DEFAULT_RANGE_DAYS = 30;
export function defaultDateRange(timeZone: string): { start_date: string; end_date: string } {
  const today = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
  let end_date: string;
  try {
    end_date = today(timeZone);
  } catch {
    end_date = today("UTC");
  }
  const start = new Date(`${end_date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - DEFAULT_RANGE_DAYS);
  return { start_date: start.toISOString().slice(0, 10), end_date };
}

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
  const { start_date, end_date, time_zone = "UTC" } = req.query;

  try {
    // No date range means the last 30 days here, not all time — the service-wide
    // count over every event ever recorded is not a useful default. Those are 30
    // calendar days, not the last 720 hours: the rows are daily buckets, so a
    // window that opens mid-day would return a first bucket holding only part of
    // its day.
    //
    // The days are cut in the caller's zone, which is where the SELECT below
    // cuts its buckets. The default range used to be cut in the ClickHouse
    // server's zone while an explicitly requested range was cut in the caller's
    // — one endpoint answering in two different zones depending on whether the
    // caller named a range. In a non-UTC zone this default now opens up to a day
    // earlier than it used to.
    const timeWindow =
      start_date && end_date
        ? parseTimeWindow(req.query)
        : parseTimeWindow({ ...defaultDateRange(time_zone), time_zone });

    const query = `
      SELECT
        toDateTime(toStartOfDay(toTimeZone(timestamp, ${SqlString.escape(time_zone)}))) as event_date,
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
      WHERE type IN ('pageview', 'custom_event', 'performance', 'outbound', 'error', 'button_click', 'copy', 'form_submit', 'input_change')
        ${timeWindowWhere(timeWindow)}
      GROUP BY event_date
      ORDER BY event_date
      ${timeWindowFill(timeWindow, "day")}
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
    });

    const data = await processResults<ServiceEventCountResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching service event count");
    return res.status(500).send({ error: "Failed to fetch service event count" });
  }
}
