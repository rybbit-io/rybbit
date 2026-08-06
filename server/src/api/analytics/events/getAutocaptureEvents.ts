import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { AutocaptureTargetType, isAutocaptureTargetType } from "../utils/eventConditions.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetAutocaptureEventsResponse = {
  value: string;
  count: number;
  lastOccurred: string;
}[];

export interface GetAutocaptureEventsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    type: string;
  }>;
}

// The single display value each event of a type is grouped by. Unlike
// AUTOCAPTURE_PATTERN_PROPS (which matches goal patterns against every prop),
// form_submit collapses to its first non-empty identifier so one submission
// counts once.
const VALUE_EXPRESSIONS: Record<AutocaptureTargetType, string> = {
  outbound: "JSONExtractString(toString(props), 'url')",
  button_click: "JSONExtractString(toString(props), 'text')",
  copy: "JSONExtractString(toString(props), 'text')",
  form_submit:
    "coalesce(nullIf(JSONExtractString(toString(props), 'formName'), ''), nullIf(JSONExtractString(toString(props), 'formId'), ''), nullIf(JSONExtractString(toString(props), 'formAction'), ''), '')",
};

export const buildAutocaptureEventsQuery = (
  query: GetAutocaptureEventsRequest["Querystring"],
  siteId: number,
  type: AutocaptureTargetType
) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = filters ? getFilterStatement(filters, siteId, timeStatement) : "";
  const valueExpression = VALUE_EXPRESSIONS[type];

  return `
    SELECT
      ${valueExpression} AS value,
      COUNT(*) AS count,
      toString(MAX(timestamp)) AS lastOccurred
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = ${SqlString.escape(type)}
      AND ${valueExpression} != ''
      ${timeStatement}
      ${filterStatement}
    GROUP BY value
    ORDER BY count DESC
    LIMIT 1000
  `;
};

// Returns autocapture events of a type (button clicks, form submissions,
// copies) grouped by their display value, with counts and last occurrence.
export const getAutocaptureEvents = analyticsRoute<GetAutocaptureEventsRequest>(
  "autocapture events",
  async (req: FastifyRequest<GetAutocaptureEventsRequest>, res: FastifyReply) => {
    const { type } = req.query;
    const site = req.params.siteId;

    if (!type || !isAutocaptureTargetType(type)) {
      return res.status(400).send({ error: "Invalid autocapture event type" });
    }

    const data = await runAnalyticsQuery<GetAutocaptureEventsResponse[number]>({
      query: buildAutocaptureEventsQuery(req.query, Number(site), type),
      params: { siteId: Number(site) },
    });

    // processResults coerces any column that looks numeric into a number; `value`
    // is free-form captured text (e.g. a button labeled "100") and must stay a string.
    return res.send({ data: data.map(row => ({ ...row, value: String(row.value) })) });
  }
);
