import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { TimeBucket } from "../types.js";
import { TimeBucketToFn, bucketIntervalMap } from "../utils/utils.js";
import { validateTimeStatementParams } from "../utils/query-validation.js";

// Lite endpoints back the simplified high-traffic dashboard. They read from
// hourly materialized views (overview_hourly_mv, sessions_mv, pathname_hourly_mv,
// country_hourly_mv) instead of raw events. Filters are not supported and
// sub-hour buckets are promoted to hour because the MVs are hour-grained.

export type LiteTimeRange = {
  startStatement: string;
  endStatement: string;
  whereClause: string;
};

// Build a WHERE-clause fragment that filters an MV's hour-bucket column.
// The `column` is whichever hour-truncated DateTime column the MV exposes
// (overview_hourly_mv uses `event_hour`; sessions_mv uses `start_time`).
export function getLiteTimeStatement(
  params: Pick<FilterParams, "start_date" | "end_date" | "time_zone" | "past_minutes_start" | "past_minutes_end">,
  column: string
): string {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;

  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const date = start_date && end_date && time_zone ? { start_date, end_date, time_zone } : undefined;

  const sanitized = validateTimeStatementParams({ date, pastMinutesRange });

  if (sanitized.date) {
    const { start_date, end_date, time_zone } = sanitized.date;
    if (!start_date && !end_date) return "";

    return `AND ${column} >= toTimeZone(
      toStartOfDay(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)})),
      'UTC'
    )
    AND ${column} < if(
      toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
      toTimeZone(now(), 'UTC'),
      toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)})) + INTERVAL 1 DAY,
        'UTC'
      )
    )`;
  }

  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);
    const startIso = startTimestamp.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTimestamp.toISOString().slice(0, 19).replace("T", " ");

    return `AND ${column} > toDateTime(${SqlString.escape(startIso)}) AND ${column} <= toDateTime(${SqlString.escape(endIso)})`;
  }

  return "";
}

// MVs are hour-bucketed, so anything below `hour` gets promoted.
export function liteBucket(bucket: TimeBucket | undefined): TimeBucket {
  if (!bucket) return "hour";
  if (bucket === "minute" || bucket === "five_minutes" || bucket === "ten_minutes" || bucket === "fifteen_minutes") {
    return "hour";
  }
  return bucket;
}

export function getLiteFillClause(
  params: FilterParams,
  bucket: TimeBucket
): string {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;
  const fn = TimeBucketToFn[bucket];
  const interval = bucketIntervalMap[bucket];

  if (start_date && end_date && time_zone) {
    return `WITH FILL FROM toTimeZone(
      toDateTime(${fn}(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)}))),
      'UTC'
    )
    TO if(
      toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
      toTimeZone(now(), 'UTC'),
      toTimeZone(
        toDateTime(${fn}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)}))) + INTERVAL 1 DAY,
        'UTC'
      )
    ) STEP INTERVAL ${interval}`;
  }

  if (past_minutes_start !== undefined && past_minutes_end !== undefined) {
    const now = new Date();
    const startTs = new Date(now.getTime() - Number(past_minutes_start) * 60 * 1000);
    const endTs = new Date(now.getTime() - Number(past_minutes_end) * 60 * 1000);
    const startIso = startTs.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTs.toISOString().slice(0, 19).replace("T", " ");
    return `WITH FILL FROM ${fn}(toDateTime(${SqlString.escape(startIso)}))
      TO ${fn}(toDateTime(${SqlString.escape(endIso)})) + INTERVAL ${interval}
      STEP INTERVAL ${interval}`;
  }

  return "";
}
