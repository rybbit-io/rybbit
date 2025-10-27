import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "../utils.js";
import { PerformanceOverviewMetrics } from "../types.js";
import { FilterParams } from "@rybbit/shared";

const getQuery = (params: FilterParams) => {
  const filterStatement = getFilterStatement(params.filters);

  return `SELECT
      quantile(0.5)(lcp) AS lcp_p50,
      quantile(0.75)(lcp) AS lcp_p75,
      quantile(0.9)(lcp) AS lcp_p90,
      quantile(0.99)(lcp) AS lcp_p99,
      quantile(0.5)(cls) AS cls_p50,
      quantile(0.75)(cls) AS cls_p75,
      quantile(0.9)(cls) AS cls_p90,
      quantile(0.99)(cls) AS cls_p99,
      quantile(0.5)(inp) AS inp_p50,
      quantile(0.75)(inp) AS inp_p75,
      quantile(0.9)(inp) AS inp_p90,
      quantile(0.99)(inp) AS inp_p99,
      quantile(0.5)(fcp) AS fcp_p50,
      quantile(0.75)(fcp) AS fcp_p75,
      quantile(0.9)(fcp) AS fcp_p90,
      quantile(0.99)(fcp) AS fcp_p99,
      quantile(0.5)(ttfb) AS ttfb_p50,
      quantile(0.75)(ttfb) AS ttfb_p75,
      quantile(0.9)(ttfb) AS ttfb_p90,
      quantile(0.99)(ttfb) AS ttfb_p99,
      COUNT(*) AS total_performance_events
    FROM events
    WHERE
        site_id = {siteId:Int32}
        AND type = 'performance'
        ${filterStatement}
        ${getTimeStatement(params)}`;
};

export interface PerformanceOverviewRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams;
}

export async function getPerformanceOverview(req: FastifyRequest<PerformanceOverviewRequest>, res: FastifyReply) {
  const site = req.params.site;

  const query = getQuery(req.query);

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<PerformanceOverviewMetrics>(result);
    return res.send({ data: data[0] });
  } catch (error) {
    console.error("Error fetching performance overview:", error);
    return res.status(500).send({ error: "Failed to fetch performance overview" });
  }
}
