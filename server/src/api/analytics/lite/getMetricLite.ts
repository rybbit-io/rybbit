import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { processResults } from "../utils/utils.js";
import { getLiteTimeStatement } from "./utils.js";

// Lite metric supports only the two dimensions backed by MVs:
//   - pathname → pathname_hourly_mv_target
//   - country → country_hourly_mv_target
// Other parameters return 400 — the simplified dashboard hides those sections.
type LiteMetricParameter = "pathname" | "country";

type LiteMetricItem = {
  value: string;
  hostname?: string;
  count: number; // sessions
  percentage: number;
  pageviews: number;
  pageviews_percentage: number;
};

export async function getMetricLite(
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: FilterParams<{ parameter: LiteMetricParameter; limit?: number }>;
  }>,
  res: FastifyReply
) {
  const site = Number(req.params.siteId);
  const { parameter } = req.query;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const timeStatement = getLiteTimeStatement(req.query, "event_hour");

  // Percentages are computed in an outer pass so the window function
  // operates on already-grouped rows. `sum(sum(...)) OVER ()` is illegal
  // in ClickHouse — aggregates can't nest.
  let query: string;
  if (parameter === "pathname") {
    query = `
      SELECT
        value,
        hostname,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage
      FROM (
        SELECT
          pathname AS value,
          any(hostname) AS hostname,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM pathname_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY pathname
      )
      ORDER BY pageviews DESC
      LIMIT ${limit}
    `;
  } else if (parameter === "country") {
    query = `
      SELECT
        value,
        pageviews,
        count,
        round(count * 100.0 / sum(count) OVER (), 2) AS percentage,
        round(pageviews * 100.0 / sum(pageviews) OVER (), 2) AS pageviews_percentage
      FROM (
        SELECT
          country AS value,
          sum(pageviews) AS pageviews,
          uniqMerge(sessions) AS count
        FROM country_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
        GROUP BY country
      )
      ORDER BY pageviews DESC
      LIMIT ${limit}
    `;
  } else {
    return res.status(400).send({ error: "Lite mode does not support this parameter" });
  }

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: { siteId: site },
    });
    const data = await processResults<LiteMetricItem>(result);
    return res.send({ data: { data, totalCount: data.length } });
  } catch (error) {
    console.error("Error fetching lite metric:", error);
    return res.status(500).send({ error: "Failed to fetch metric" });
  }
}
