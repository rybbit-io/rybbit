import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

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

export async function getOutboundLinks(req: FastifyRequest<GetOutboundLinksRequest>, res: FastifyReply) {
  const { filters } = req.query;
  const site = req.params.siteId;

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters ? getFilterStatement(filters, Number(site), timeStatement) : "";

  const query = `
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

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetOutboundLinksResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching outbound links:", error);
    return res.status(500).send({ error: "Failed to fetch outbound links" });
  }
}
