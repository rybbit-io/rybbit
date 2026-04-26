import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { processResults } from "../utils/utils.js";
import { getLiteTimeStatement } from "./utils.js";

type GetOverviewLiteResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

export async function getOverviewLite(
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: FilterParams;
  }>,
  res: FastifyReply
) {
  const site = Number(req.params.siteId);
  const timeStatement = getLiteTimeStatement(req.query, "start_time");

  // Pulls every metric from sessions_mv. SimpleAggregateFunction(min/max/sum)
  // columns can be selected with bare min/max/sum — no Merge needed.
  // Aliases must NOT collide with the source column names — ClickHouse will
  // resolve `start_time` in WHERE as the aggregate alias and reject it.
  const query = `
    SELECT
      count() AS sessions,
      sum(session_pageviews) AS pageviews,
      uniqExact(user_id) AS users,
      avg(session_pageviews) AS pages_per_session,
      countIf(session_pageviews = 1) / count() * 100 AS bounce_rate,
      avg(session_end - session_start) AS session_duration
    FROM (
      SELECT
        session_id,
        any(user_id) AS user_id,
        sum(pageviews) AS session_pageviews,
        min(start_time) AS session_start,
        max(end_time) AS session_end
      FROM sessions_mv_target
      WHERE site_id = {siteId:Int32}
        ${timeStatement}
      GROUP BY session_id
    )
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: { siteId: site },
    });
    const data = await processResults<GetOverviewLiteResponse>(result);
    return res.send({ data: data[0] });
  } catch (error) {
    console.error("Error fetching lite overview:", error);
    return res.status(500).send({ error: "Failed to fetch overview" });
  }
}
