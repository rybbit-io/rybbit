import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetOutboundLinksResponse = {
  url: string;
  count: number;
  lastClicked: string;
}[];

export interface GetOutboundLinksRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{}>;
}

export const buildOutboundLinksQuery = (query: GetOutboundLinksRequest["Querystring"], siteId: number) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = filters ? getFilterStatement(filters, siteId, timeStatement) : "";

  return `
    SELECT
      JSONExtractString(toString(props), 'url') AS url,
      COUNT(*) AS count,
      toString(MAX(timestamp)) AS lastClicked
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'outbound'
      ${timeStatement}
      ${filterStatement}
    GROUP BY url
    ORDER BY count DESC
    LIMIT 1000
  `;
};

export const getOutboundLinks = analyticsRoute<GetOutboundLinksRequest>(
  "outbound links",
  async (req: FastifyRequest<GetOutboundLinksRequest>, res: FastifyReply) => {
    const site = req.params.siteId;

    const data = await runAnalyticsQuery<GetOutboundLinksResponse[number]>({
      query: buildOutboundLinksQuery(req.query, Number(site)),
      params: { siteId: Number(site) },
    });

    return res.send({ data });
  }
);
