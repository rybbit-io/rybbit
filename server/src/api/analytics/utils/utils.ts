import { ResultSet } from "@clickhouse/client";
import { FilterParams } from "@rybbit/shared";
import { and, eq, inArray } from "drizzle-orm";
import SqlString from "sqlstring";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles } from "../../../db/postgres/schema.js";
import { validateTimeStatementParams } from "./query-validation.js";

export function getTimeStatement(
  params: Pick<FilterParams, "start_date" | "end_date" | "time_zone" | "past_minutes_start" | "past_minutes_end">
) {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;

  // Construct the legacy format for validation
  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const date = start_date && end_date && time_zone ? { start_date, end_date, time_zone } : undefined;

  // Sanitize inputs with Zod
  const sanitized = validateTimeStatementParams({
    date,
    pastMinutesRange,
  });

  if (sanitized.date) {
    const { start_date, end_date, time_zone } = sanitized.date;
    if (!start_date && !end_date) {
      return "";
    }

    // Use SqlString.escape for date and timeZone values
    return `AND timestamp >= toTimeZone(
      toStartOfDay(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)})),
      'UTC'
      )
      AND timestamp < if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        now(),
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;
  }

  // Handle specific range of past minutes - convert to exact timestamps for better performance
  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;

    // Calculate exact timestamps in JavaScript to avoid runtime ClickHouse calculations
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);

    // Format as YYYY-MM-DD HH:MM:SS without milliseconds for ClickHouse
    const startIso = startTimestamp.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTimestamp.toISOString().slice(0, 19).replace("T", " ");

    return `AND timestamp > toDateTime(${SqlString.escape(startIso)}) AND timestamp <= toDateTime(${SqlString.escape(endIso)})`;
  }

  // If no valid time parameters were provided, return empty string
  return "";
}

export async function processResults<T>(results: ResultSet<"JSONEachRow">): Promise<T[]> {
  const data: T[] = await results.json();
  for (const row of data) {
    for (const key in row) {
      // Only convert to number if the value is not null/undefined and is a valid number
      if (
        key !== "session_id" &&
        key !== "user_id" &&
        key !== "identified_user_id" &&
        key !== "effective_user_id" &&
        row[key] !== null &&
        row[key] !== undefined &&
        row[key] !== "" &&
        row[key] !== true &&
        row[key] !== false &&
        !isNaN(Number(row[key]))
      ) {
        row[key] = Number(row[key]) as any;
      }
    }
  }
  return data;
}

/**
 * Converts wildcard path patterns to ClickHouse regex pattern
 * - Supports * for matching a single path segment (not including /)
 * - Supports ** for matching multiple path segments (including /)
 * @param pattern Path pattern with wildcards
 * @returns ClickHouse-compatible regex string
 */
export function patternToRegex(pattern: string): string {
  // Escape special regex characters except * which we'll handle specially
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  // Replace ** with a temporary marker
  const withDoubleStar = escapedPattern.replace(/\*\*/g, "{{DOUBLE_STAR}}");

  // Replace * with [^/]+ (any characters except /)
  const withSingleStar = withDoubleStar.replace(/\*/g, "[^/]+");

  // Replace the double star marker with .* (any characters including /)
  const finalRegex = withSingleStar.replace(/{{DOUBLE_STAR}}/g, ".*");

  // Anchor the regex to start/end of string for exact matches
  return `^${finalRegex}$`;
}

// Time bucket mapping constants
export const TimeBucketToFn = {
  minute: "toStartOfMinute",
  five_minutes: "toStartOfFiveMinutes",
  ten_minutes: "toStartOfTenMinutes",
  fifteen_minutes: "toStartOfFifteenMinutes",
  hour: "toStartOfHour",
  day: "toStartOfDay",
  week: "toStartOfWeek",
  month: "toStartOfMonth",
  year: "toStartOfYear",
} as const;

export const bucketIntervalMap = {
  minute: "1 MINUTE",
  five_minutes: "5 MINUTES",
  ten_minutes: "10 MINUTES",
  fifteen_minutes: "15 MINUTES",
  hour: "1 HOUR",
  day: "1 DAY",
  week: "7 DAY",
  month: "1 MONTH",
  year: "1 YEAR",
} as const;

/**
 * Enriches data with user traits from Postgres for identified users.
 * This is a shared utility to avoid duplicating the traits fetching logic.
 * Uses identified_user_id to look up traits since that's the custom user ID.
 */
export async function enrichWithTraits<T extends { identified_user_id: string }>(
  data: T[],
  siteId: number
): Promise<Array<T & { traits: Record<string, unknown> | null }>> {
  const identifiedUserIds = [
    ...new Set(data.filter(item => item.identified_user_id).map(item => item.identified_user_id)),
  ];

  let traitsMap: Map<string, Record<string, unknown>> = new Map();
  if (identifiedUserIds.length > 0) {
    const profiles = await db
      .select({
        userId: userProfiles.userId,
        traits: userProfiles.traits,
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.siteId, siteId), inArray(userProfiles.userId, identifiedUserIds)));

    traitsMap = new Map(
      profiles.map(p => [
        p.userId,
        p.traits && typeof p.traits === "object" && !Array.isArray(p.traits)
          ? (p.traits as Record<string, unknown>)
          : {},
      ])
    );
  }

  return data.map(item => ({ ...item, traits: traitsMap.get(item.identified_user_id) || null }));
}
