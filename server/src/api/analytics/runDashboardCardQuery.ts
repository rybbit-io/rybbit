import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { z } from "zod";
import { clickhouseQuery } from "../../db/clickhouse/clickhouse.js";
import {
  MAX_CUSTOM_QUERY_LENGTH,
  normalizeCustomQuery,
  sanitizeClickhouseError,
  validateScopedQuery,
} from "./utils/customQueryValidation.js";
import { validateHttpTimeParams } from "./utils/query-validation.js";
import { bucketIntervalMap, getTimeStatement } from "./utils/timeWindow.js";

// Mirrors the rybbit_query ClickHouse profile (docker-compose clickhouse_user_settings).
const MAX_EXECUTION_TIME_SECONDS = 10;
const MAX_RESULT_ROWS = 1000;

const BUCKET_TOKEN = /\{\{\s*bucket\s*\}\}/gi;
const TZ_TOKEN = /\{\{\s*tz\s*\}\}/gi;

// Only the two fields the time window doesn't own. The bounds are checked by
// validateHttpTimeParams below rather than re-described here: a second schema
// that merely looked similar would accept an unpaired, reversed or impossible
// bound (`25:00:00` matches the format), which the window then drops — silently
// widening the card to all time.
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

  // The bounds arrive in the body, so validateTimeParams — a query-param
  // preHandler — never sees them. Run the same validator the routes run, on the
  // same param names, so this endpoint rejects exactly what they reject.
  const timeParams = {
    start_date: body.data.startDate,
    end_date: body.data.endDate,
    time_zone: body.data.timeZone,
    start_datetime: body.data.startDateTime,
    end_datetime: body.data.endDateTime,
    past_minutes_start: body.data.pastMinutesStart,
    past_minutes_end: body.data.pastMinutesEnd,
  };
  const timeError = validateHttpTimeParams(timeParams);
  if (timeError) {
    return reply.status(400).send({ error: timeError });
  }

  // Substitute {{bucket}} and {{tz}} BEFORE validation so the validator never
  // sees the template tokens. {{bucket}} comes from an allowlisted enum mapped
  // to a constant interval string; {{tz}} is SqlString-escaped to a quoted
  // literal — both injection-safe. {{tz}} lets time-series cards bucket in the
  // viewer's timezone (e.g. toStartOfInterval(toTimeZone(timestamp, {{tz}}), ...))
  // so day buckets align to local calendar days, matching the standard charts.
  const bucketInterval = bucketIntervalMap[body.data.bucket ?? "hour"];
  const timeZoneLiteral = SqlString.escape(body.data.timeZone || "UTC");
  const substitutedQuery = body.data.query
    .replace(BUCKET_TOKEN, bucketInterval)
    .replace(TZ_TOKEN, timeZoneLiteral);

  const validationError = validateScopedQuery(substitutedQuery);
  if (validationError) {
    return reply.status(400).send({ error: validationError });
  }

  // Auto-scope the timestamp to the global time range. getTimeStatement returns
  // an "AND timestamp >= ... AND timestamp < ..." fragment (or "" for all-time),
  // with all values Zod-sanitized and SqlString-escaped internally.
  const timeStatement = getTimeStatement(timeParams);

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
    const result = await clickhouseQuery.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteIds: [siteId],
        limit: MAX_RESULT_ROWS,
      },
      // Execution limits (readonly, max_execution_time, max_memory_usage,
      // max_result_rows, …) come from the rybbit_query settings profile and are
      // pinned there with constraints; sending them here would be rejected.
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
    return reply.status(400).send({ error: sanitizeClickhouseError(error) });
  }
}
