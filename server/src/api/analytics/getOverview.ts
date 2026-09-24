import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  buildMetricsSpec,
  buildOverviewQuery as buildOverviewMetricsQuery,
  OverviewRow,
} from "../../services/siteMetrics/siteMetrics.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";

/**
 * The metric definitions live in the Site Metrics module so the PDF report and the
 * weekly email report the same numbers as this dashboard.
 */
export const buildOverviewQuery = (params: FilterParams, siteId: number) =>
  buildOverviewMetricsQuery(buildMetricsSpec(params, siteId));

export interface OverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams;
}

export const getOverview = analyticsRoute<OverviewRequest>(
  "overview",
  async (req: FastifyRequest<OverviewRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const data = await runAnalyticsQuery<OverviewRow>({
      query: buildOverviewQuery(req.query, siteId),
      params: { siteId },
    });

    return res.send({ data: data[0] });
  }
);
