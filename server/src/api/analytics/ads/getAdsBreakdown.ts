import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, processResults } from "../utils/utils.js";

interface GetAdsBreakdownRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    parameter: string;
    type?: string;
    limit?: string;
  }>;
}

interface AdsBreakdownRow {
  value: string;
  count: number;
  percentage: number;
}

const ALLOWED_PARAMETERS = ["country", "pathname", "creative_url"] as const;
const ALLOWED_TYPES = ["ad_click", "ad_impression"] as const;

export async function getAdsBreakdown(
  req: FastifyRequest<GetAdsBreakdownRequest>,
  res: FastifyReply
) {
  const { filters, parameter, type: typeParam, limit: limitStr } = req.query;
  const site = req.params.siteId;
  const limit = limitStr ? Math.min(Number(limitStr), 100) : 20;
  const type = typeParam && ALLOWED_TYPES.includes(typeParam as any) ? typeParam : "ad_click";

  if (!parameter || !ALLOWED_PARAMETERS.includes(parameter as any)) {
    return res
      .status(400)
      .send({ error: `Invalid parameter. Allowed: ${ALLOWED_PARAMETERS.join(", ")}` });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters
    ? getFilterStatement(filters, Number(site), timeStatement)
    : "";

  const valueExpr =
    parameter === "creative_url"
      ? "JSONExtractString(toString(props), 'creative_url')"
      : parameter;

  const query = `
    SELECT
      ${valueExpr} as value,
      count() as count,
      round((count() / sum(count()) OVER ()) * 100, 2) as percentage
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = {type:String}
      ${timeStatement}
      ${filterStatement}
      AND ${valueExpr} IS NOT NULL
      AND ${valueExpr} != ''
    GROUP BY ${valueExpr}
    ORDER BY count DESC
    LIMIT {limit:Int32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        type,
        limit,
      },
    });

    const data = await processResults<AdsBreakdownRow>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching ads breakdown:", error);
    return res.status(500).send({ error: "Failed to fetch ads breakdown" });
  }
}
