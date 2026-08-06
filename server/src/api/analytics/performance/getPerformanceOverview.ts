import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { PerformanceOverviewMetrics } from "../types.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export const buildPerformanceOverviewQuery = (query: FilterParams, siteId: number) => {
  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);

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
        ${timeStatement}`;
};

export interface PerformanceOverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams;
}

export const getPerformanceOverview = analyticsRoute<PerformanceOverviewRequest>(
  "performance overview",
  async (req: FastifyRequest<PerformanceOverviewRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const data = await runAnalyticsQuery<PerformanceOverviewMetrics>({
      query: buildPerformanceOverviewQuery(req.query, siteId),
      params: { siteId },
    });

    return res.send({ data: data[0] });
  }
);
