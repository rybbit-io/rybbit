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
  // pre-computed sums and one HLL state. `if(sum(sessions) > 0, ...)` guards
  // against div-by-zero on empty time ranges.
  const query = `
    SELECT
      sum(sessions) AS sessions,
      sum(pageviews) AS pageviews,
      uniqMerge(users) AS users,
      if(sum(sessions) > 0, sum(pageviews) / sum(sessions), 0) AS pages_per_session,
      if(sum(sessions) > 0, sum(bounced_sessions) * 100.0 / sum(sessions), 0) AS bounce_rate,
      if(sum(sessions) > 0, sum(total_session_duration_seconds) / sum(sessions), 0) AS session_duration
    FROM session_hourly_mv_target
    WHERE site_id = {siteId:Int32}
      ${timeStatement}
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
