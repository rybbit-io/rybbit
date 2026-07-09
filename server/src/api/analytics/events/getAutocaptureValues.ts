import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { AUTOCAPTURE_PATTERN_PROPS, isAutocaptureTargetType } from "../utils/eventConditions.js";

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

// Returns the most common values of an autocapture type's primary props
// (outbound urls, button texts, form names/ids, copied texts), used as
// suggestions when configuring goals and funnel steps.
export async function getAutocaptureValues(req: FastifyRequest<GetAutocaptureValuesRequest>, res: FastifyReply) {
  const { type } = req.query;
  const site = req.params.siteId;

  if (!type || !isAutocaptureTargetType(type)) {
    return res.status(400).send({ error: "Invalid autocapture event type" });
  }

  const timeStatement = getTimeStatement(req.query);

  const propExtracts = AUTOCAPTURE_PATTERN_PROPS[type]
    .map(prop => `JSONExtractString(toString(props), ${SqlString.escape(prop)})`)
    .join(", ");

  const query = `
    SELECT value, COUNT(*) AS count
    FROM (
      SELECT arrayJoin([${propExtracts}]) AS value
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = ${SqlString.escape(type)}
        ${timeStatement}
    )
    WHERE value <> ''
    GROUP BY value
    ORDER BY count DESC
    LIMIT 500
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetAutocaptureValuesResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching autocapture values:", error);
    return res.status(500).send({ error: "Failed to fetch autocapture values" });
  }
}
