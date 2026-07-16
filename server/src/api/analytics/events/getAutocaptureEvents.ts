import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { AutocaptureTargetType, isAutocaptureTargetType } from "../utils/eventConditions.js";

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

// Returns autocapture events of a type (button clicks, form submissions,
// copies) grouped by their display value, with counts and last occurrence.
export async function getAutocaptureEvents(req: FastifyRequest<GetAutocaptureEventsRequest>, res: FastifyReply) {
  const { type, filters } = req.query;
  const site = req.params.siteId;

  if (!type || !isAutocaptureTargetType(type)) {
    return res.status(400).send({ error: "Invalid autocapture event type" });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters ? getFilterStatement(filters, Number(site), timeStatement) : "";
  const valueExpression = VALUE_EXPRESSIONS[type];

  const query = `
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

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetAutocaptureEventsResponse[number]>(result);
    // processResults coerces any column that looks numeric into a number; `value`
    // is free-form captured text (e.g. a button labeled "100") and must stay a string.
    return res.send({ data: data.map(row => ({ ...row, value: String(row.value) })) });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching autocapture events:", error);
    return res.status(500).send({ error: "Failed to fetch autocapture events" });
  }
}
