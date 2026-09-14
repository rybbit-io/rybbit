import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { resolveTimeWindow } from "../analytics/utils/timeWindow.js";
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
  const { time_zone = "UTC" } = req.query;

  try {
    // No range asked for means the last 30 days, resolved to an explicit pair so
    // the predicate and the fill come from one window rather than two
    // hand-written defaults that have to agree.
    const today = DateTime.now().setZone(time_zone);
    const start_date = req.query.start_date || today.minus({ days: 30 }).toFormat("yyyy-MM-dd");
    const end_date = req.query.end_date || today.toFormat("yyyy-MM-dd");

    const window = resolveTimeWindow({ start_date, end_date, time_zone });

    const query = `
      SELECT
        ${window.bucketed("timestamp", "day")} as event_date,
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
        ${window.where()}
      GROUP BY event_date
      ORDER BY event_date
      ${window.fill("day")}
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
