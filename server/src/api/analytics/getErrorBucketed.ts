import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { resolveTimeWindow } from "./utils/timeWindow.js";
import { TimeBucket } from "./types.js";
import { AnalyticsQueryError, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { buildSessionAndRowFilterFragments, TARGET_EVENT_ROW_LEVEL_PARAMS } from "./utils/sessionFilters.js";

interface GetErrorBucketedRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    errorMessage: string;
  }>;
}

export type GetErrorBucketedResponse = {
  time: string;
  error_count: number;
}[];

export const buildErrorBucketedQuery = (query: GetErrorBucketedRequest["Querystring"], siteId: number) => {
  const { bucket } = query;
  const window = resolveTimeWindow(query);
  const timeStatement = window.where();
  const { filteredSessionsCTE, rowFilterStatement } = buildSessionAndRowFilterFragments(
    query.filters,
    siteId,
    timeStatement,
    TARGET_EVENT_ROW_LEVEL_PARAMS
  );
  const sessionJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const timeStatementFill = window.fill(bucket);

  return `
      ${filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : ""}
      SELECT
        ${window.bucketed("timestamp", bucket)} AS time,
        COUNT(*) AS error_count
      FROM events
      ${sessionJoin}
      WHERE
        site_id = {siteId:Int32}
        AND type = 'error'
        AND JSONExtractString(toString(props), 'message') = {errorMessage:String}
        ${rowFilterStatement}
        ${timeStatement}
      GROUP BY time
      ORDER BY time
      ${timeStatementFill}
    `;
};

export async function getErrorBucketed(req: FastifyRequest<GetErrorBucketedRequest>, res: FastifyReply) {
  const site = req.params.siteId;
  const { errorMessage } = req.query;

  if (!errorMessage) {
    return res.status(400).send({ error: "errorMessage parameter is required" });
  }

  const numericSiteId = Number(site);

  try {
    const data = await runAnalyticsQuery<GetErrorBucketedResponse[number]>({
      query: buildErrorBucketedQuery(req.query, numericSiteId),
      params: {
        siteId: numericSiteId,
        errorMessage: errorMessage,
      },
    });

    return res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    req.log.error(
      { err: error instanceof AnalyticsQueryError ? error.original : error },
      "Error getting error bucketed data"
    );
    return res.status(500).send({
      success: false,
      error: "Failed to get error data",
    });
  }
}
