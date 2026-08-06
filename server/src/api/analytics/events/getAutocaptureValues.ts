import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { getTimeStatement } from "../utils/utils.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { FilterParams } from "@rybbit/shared";
import { AUTOCAPTURE_PATTERN_PROPS, AutocaptureTargetType, isAutocaptureTargetType } from "../utils/eventConditions.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetAutocaptureValuesResponse = {
  value: string;
  count: number;
}[];

export interface GetAutocaptureValuesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    type: string;
  }>;
}

export const buildAutocaptureValuesQuery = (
  query: GetAutocaptureValuesRequest["Querystring"],
  siteId: number,
  type: AutocaptureTargetType
) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = filters ? getFilterStatement(filters, siteId, timeStatement) : "";

  const propExtracts = AUTOCAPTURE_PATTERN_PROPS[type]
    .map(prop => `JSONExtractString(toString(props), ${SqlString.escape(prop)})`)
    .join(", ");

  return `
    SELECT value, COUNT(*) AS count
    FROM (
      SELECT arrayJoin([${propExtracts}]) AS value
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = ${SqlString.escape(type)}
        ${timeStatement}
        ${filterStatement}
    )
    WHERE value <> ''
    GROUP BY value
    ORDER BY count DESC
    LIMIT 500
  `;
};

// Returns the most common values of an autocapture type's primary props
// (outbound urls, button texts, form names/ids, copied texts), used as
// suggestions when configuring goals and funnel steps.
export const getAutocaptureValues = analyticsRoute<GetAutocaptureValuesRequest>(
  "autocapture values",
  async (req: FastifyRequest<GetAutocaptureValuesRequest>, res: FastifyReply) => {
    const { type } = req.query;
    const site = req.params.siteId;

    if (!type || !isAutocaptureTargetType(type)) {
      return res.status(400).send({ error: "Invalid autocapture event type" });
    }

    const data = await runAnalyticsQuery<GetAutocaptureValuesResponse[number]>({
      query: buildAutocaptureValuesQuery(req.query, Number(site), type),
      params: { siteId: Number(site) },
    });

    // processResults coerces any column that looks numeric into a number; `value`
    // is free-form captured text (e.g. a button labeled "100") and must stay a string.
    return res.send({ data: data.map(row => ({ ...row, value: String(row.value) })) });
  }
);
