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
  const timeStatement = getLiteTimeStatement(req.query, "session_hour");

  // Single read of the refreshable session_hourly_mv_target — ~720 rows/month
  // per site instead of millions of session rows. All 6 metrics derive from
  // pre-computed sums and one HLL state.
  //
  // Aggregations run in the inner subquery; divisions compose plain values in
  // the outer SELECT. Don't alias `sum(sessions) AS sessions` at this level —
  // ClickHouse will resolve the column name to the aggregate and reject as
  // nested aggregation.
  const query = `
    SELECT
      sessions,
      pageviews,
      users,
      if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
      if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
      if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
    FROM (
      SELECT
        sum(sessions) AS sessions,
        sum(pageviews) AS pageviews,
        uniqMerge(users) AS users,
        sum(bounced_sessions) AS bounced_sessions,
        sum(total_session_duration_seconds) AS total_session_duration_seconds
      FROM session_hourly_mv_target
      WHERE site_id = {siteId:Int32}
        ${timeStatement}
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
