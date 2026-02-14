import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, processResults } from "../utils/utils.js";

interface GetAdClicksBreakdownRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    parameter: string;
    limit?: string;
  }>;
}

interface AdClicksBreakdownRow {
  value: string;
  count: number;
  percentage: number;
}

const ALLOWED_PARAMETERS = ["country", "pathname"] as const;

export async function getAdClicksBreakdown(
  req: FastifyRequest<GetAdClicksBreakdownRequest>,
  res: FastifyReply
) {
  const { filters, parameter, limit: limitStr } = req.query;
  const site = req.params.siteId;
  const limit = limitStr ? Math.min(Number(limitStr), 100) : 20;

  if (!parameter || !ALLOWED_PARAMETERS.includes(parameter as any)) {
    return res
      .status(400)
      .send({ error: `Invalid parameter. Allowed: ${ALLOWED_PARAMETERS.join(", ")}` });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters
    ? getFilterStatement(filters, Number(site), timeStatement)
    : "";

  const query = `
    SELECT
      ${parameter} as value,
      count() as count,
      round((count() / sum(count()) OVER ()) * 100, 2) as percentage
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'ad_click'
      ${timeStatement}
      ${filterStatement}
      AND ${parameter} IS NOT NULL
      AND ${parameter} != ''
    GROUP BY ${parameter}
    ORDER BY count DESC
    LIMIT {limit:Int32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        limit,
      },
    });

    const data = await processResults<AdClicksBreakdownRow>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching ad clicks breakdown:", error);
    return res.status(500).send({ error: "Failed to fetch ad clicks breakdown" });
  }
}
