import { FastifyReply, FastifyRequest } from "fastify";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { TimeBucket, PerformanceTimeSeriesPoint } from "../types.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export const buildPerformanceTimeSeriesQuery = (params: FilterParams<{ bucket: TimeBucket }>, siteId: number) => {
  const { bucket = "hour", filters } = params;

  const window = resolveTimeWindow(params);
  const timeStatement = window.where();
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  const query = `
SELECT
    ${window.bucketed("timestamp", bucket)} AS time,
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
    COUNT(*) AS event_count
FROM events
WHERE
    site_id = {siteId:Int32}
    AND type = 'performance'
    ${filterStatement}
    ${timeStatement}
GROUP BY time ORDER BY time ${window.fill(bucket)}`;

  return query;
};

interface GetPerformanceTimeSeriesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
  }>;
}

export const getPerformanceTimeSeries = analyticsRoute<GetPerformanceTimeSeriesRequest>(
  "performance time series",
  async (req: FastifyRequest<GetPerformanceTimeSeriesRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const data = await runAnalyticsQuery<PerformanceTimeSeriesPoint>({
      query: buildPerformanceTimeSeriesQuery(req.query, siteId),
      params: { siteId },
    });

    return res.send({ data });
  }
);
