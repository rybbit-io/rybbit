import { ResultSet } from "@clickhouse/client";
import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { filterParamSchema, validateFilters, validateTimeStatementParams } from "./query-validation.js";
import { FilterParameter, FilterType } from "./types.js";

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
        row[key] !== null &&
        row[key] !== undefined &&
        row[key] !== "" &&
        !isNaN(Number(row[key]))
      ) {
        row[key] = Number(row[key]) as any;
      }
    }
  }
  return data;
}

const filterTypeToOperator = (type: FilterType) => {
  switch (type) {
    case "equals":
      return "=";
    case "not_equals":
      return "!=";
    case "contains":
      return "LIKE";
    case "not_contains":
      return "NOT LIKE";
  }
};

export const getSqlParam = (parameter: FilterParameter) => {
  // Handle URL parameters through the url_parameters map
  if (parameter.startsWith("utm_") || parameter.startsWith("url_param:")) {
    // For explicit url_param: prefix (e.g., url_param:campaign_id)
    if (parameter.startsWith("url_param:")) {
      const paramName = parameter.substring("url_param:".length);
      return `url_parameters['${paramName}']`;
    }

    const utm = parameter; // e.g., utm_source, utm_medium, etc.
    return `url_parameters['${utm}']`;
  }

  if (parameter === "referrer") {
    return "domainWithoutWWW(referrer)";
  }
  if (parameter === "entry_page") {
    return "(SELECT argMin(pathname, timestamp) FROM events WHERE session_id = events.session_id)";
  }
  if (parameter === "exit_page") {
    return "(SELECT argMax(pathname, timestamp) FROM events WHERE session_id = events.session_id)";
  }
  if (parameter === "dimensions") {
    return "concat(toString(screen_width), 'x', toString(screen_height))";
  }
  if (parameter === "city") {
    return "concat(toString(region), '-', toString(city))";
  }
  if (parameter === "browser_version") {
    return "concat(toString(browser), ' ', toString(browser_version))";
  }
  if (parameter === "operating_system_version") {
    return `CASE 
      WHEN concat(toString(operating_system), ' ', toString(operating_system_version)) = 'Windows 10' 
      THEN 'Windows 10/11' 
      ELSE concat(toString(operating_system), ' ', toString(operating_system_version)) 
    END`;
  }
  return filterParamSchema.parse(parameter);
};

export function getFilterStatement(filters: string, siteId?: number, timeStatement?: string) {
  if (!filters) {
    return "";
  }

  // Sanitize inputs with Zod
  const filtersArray = validateFilters(filters);

  if (filtersArray.length === 0) {
    return "";
  }

  const siteIdFilter = siteId ? `site_id = ${siteId}` : "";
  // Strip leading "AND " from timeStatement since we'll be constructing WHERE clauses
  const timeFilter = timeStatement ? timeStatement.replace(/^AND\s+/i, "").trim() : "";

  return (
    "AND " +
    filtersArray
      .map(filter => {
        const x = filter.type === "contains" || filter.type === "not_contains" ? "%" : "";
        const isNumericParam = filter.parameter === "lat" || filter.parameter === "lon";

        // Handle event_name as a session-level filter
        // This ensures we filter to sessions containing the event, but still count all pageviews in those sessions
        if (filter.parameter === "event_name") {
          const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
          const eventNameCondition =
            filter.value.length === 1
              ? `event_name ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + filter.value[0] + x)}`
              : `(${filter.value.map(value => `event_name ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + value + x)}`).join(" OR ")})`;

          const finalWhere = whereClause
            ? `WHERE ${whereClause} AND ${eventNameCondition}`
            : `WHERE ${eventNameCondition}`;

          return `session_id IN (
            SELECT DISTINCT session_id
            FROM events
            ${finalWhere}
          )`;
        }

        if (filter.parameter === "entry_page") {
          const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
          const whereStatement = whereClause ? `WHERE ${whereClause}` : "";

          if (filter.value.length === 1) {
            return `session_id IN (
              SELECT session_id
              FROM (
                SELECT
                  session_id,
                  argMin(pathname, timestamp) AS entry_pathname
                FROM events
                ${whereStatement}
                GROUP BY session_id
              )
              WHERE entry_pathname ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + filter.value[0] + x)}
            )`;
          }

          const valuesWithOperator = filter.value.map(
            value => `entry_pathname ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + value + x)}`
          );

          return `session_id IN (
            SELECT session_id
            FROM (
              SELECT
                session_id,
                argMin(pathname, timestamp) AS entry_pathname
              FROM events
              ${whereStatement}
              GROUP BY session_id
            )
            WHERE (${valuesWithOperator.join(" OR ")})
          )`;
        }

        if (filter.parameter === "exit_page") {
          const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
          const whereStatement = whereClause ? `WHERE ${whereClause}` : "";

          if (filter.value.length === 1) {
            return `session_id IN (
              SELECT session_id
              FROM (
                SELECT
                  session_id,
                  argMax(pathname, timestamp) AS exit_pathname
                FROM events
                ${whereStatement}
                GROUP BY session_id
              )
              WHERE exit_pathname ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + filter.value[0] + x)}
            )`;
          }

          const valuesWithOperator = filter.value.map(
            value => `exit_pathname ${filterTypeToOperator(filter.type)} ${SqlString.escape(x + value + x)}`
          );

          return `session_id IN (
            SELECT session_id
            FROM (
              SELECT
                session_id,
                argMax(pathname, timestamp) AS exit_pathname
              FROM events
              ${whereStatement}
              GROUP BY session_id
            )
            WHERE (${valuesWithOperator.join(" OR ")})
          )`;
        }

        // Special handling for lat/lon with tolerance
        if (filter.parameter === "lat" || filter.parameter === "lon") {
          const tolerance = 0.001;
          if (filter.value.length === 1) {
            const targetValue = Number(filter.value[0]);
            return `${filter.parameter} >= ${targetValue - tolerance} AND ${filter.parameter} <= ${targetValue + tolerance}`;
          }

          const rangeConditions = filter.value.map(value => {
            const targetValue = Number(value);
            return `(${filter.parameter} >= ${targetValue - tolerance} AND ${filter.parameter} <= ${targetValue + tolerance})`;
          });

          return `(${rangeConditions.join(" OR ")})`;
        }

        if (filter.value.length === 1) {
          const value = isNumericParam ? filter.value[0] : SqlString.escape(x + filter.value[0] + x);
          return `${getSqlParam(filter.parameter)} ${filterTypeToOperator(filter.type)} ${value}`;
        }

        const valuesWithOperator = filter.value.map(value => {
          const escapedValue = isNumericParam ? value : SqlString.escape(x + value + x);
          return `${getSqlParam(filter.parameter)} ${filterTypeToOperator(filter.type)} ${escapedValue}`;
        });

        return `(${valuesWithOperator.join(" OR ")})`;
      })
      .join(" AND ")
  );
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
