import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { MAX_CUSTOM_QUERY_LENGTH, normalizeCustomQuery, validateScopedQuery } from "./utils/customQueryValidation.js";
import { bucketIntervalMap, getTimeStatement } from "./utils/utils.js";

const MAX_EXECUTION_TIME_SECONDS = 10;
const MAX_RESULT_ROWS = 1000;

const BUCKET_TOKEN = /\{\{\s*bucket\s*\}\}/gi;

const requestBodySchema = z.object({
  query: z.string().trim().min(1).max(MAX_CUSTOM_QUERY_LENGTH),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeZone: z.string().optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  pastMinutesStart: z.number().optional(),
  pastMinutesEnd: z.number().optional(),
  bucket: z
    .enum(["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"])
    .optional(),
});

export async function runDashboardCardQuery(
  request: FastifyRequest<{
    Params: {
      siteId: string;
    };
    Body: unknown;
  }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  const body = requestBodySchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: body.error.errors[0]?.message ?? "Invalid request body" });
  }

  // Substitute {{bucket}} BEFORE validation so the validator never sees the
  // template token. The value comes from an allowlisted enum mapped to a
  // constant interval string, so this is injection-safe.
  const bucketInterval = bucketIntervalMap[body.data.bucket ?? "hour"];
  const substitutedQuery = body.data.query.replace(BUCKET_TOKEN, bucketInterval);

  const validationError = validateScopedQuery(substitutedQuery);
  if (validationError) {
    return reply.status(400).send({ error: validationError });
  }

  // Auto-scope the timestamp to the global time range. getTimeStatement returns
  // an "AND timestamp >= ... AND timestamp < ..." fragment (or "" for all-time),
  // with all values Zod-sanitized and SqlString-escaped internally.
  const timeStatement = getTimeStatement({
    start_date: body.data.startDate ?? "",
    end_date: body.data.endDate ?? "",
    time_zone: body.data.timeZone ?? "",
    start_datetime: body.data.startDateTime,
    end_datetime: body.data.endDateTime,
    past_minutes_start: body.data.pastMinutesStart,
    past_minutes_end: body.data.pastMinutesEnd,
  });

  const query = `
    WITH scoped_events AS (
      SELECT *
      FROM events
      PREWHERE site_id IN {siteIds:Array(UInt16)}
      WHERE 1=1 ${timeStatement}
    )
    SELECT *
    FROM (
      ${normalizeCustomQuery(substitutedQuery)}
    )
    LIMIT {limit:UInt32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteIds: [siteId],
        limit: MAX_RESULT_ROWS,
      },
      clickhouse_settings: {
        max_execution_time: MAX_EXECUTION_TIME_SECONDS,
        max_result_rows: String(MAX_RESULT_ROWS),
        result_overflow_mode: "break",
        readonly: "2",
      },
    });

    const data = await result.json<Record<string, unknown>>();
    return reply.send({
      data,
      meta: {
        queryId: result.query_id,
        rowCount: data.length,
        maxExecutionTimeSeconds: MAX_EXECUTION_TIME_SECONDS,
        maxRows: MAX_RESULT_ROWS,
      },
    });
  } catch (error) {
    request.log.error(error, "Failed to run dashboard card query");
    const message = error instanceof Error && error.message ? error.message : "Failed to run query";
    return reply.status(400).send({ error: message });
  }
}
