import { ResultSet } from "@clickhouse/client";
import { Filter, FilterParameter, FilterType } from "./types.js";
import {
  validateTimeStatementParams,
  validateFilters,
  filterParamSchema,
} from "./query-validation.js";
import SqlString from "sqlstring";

export function getTimeStatement({
  date,
  pastMinutes,
  minutes,
  pastMinutesRange,
}: {
  date?: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
    table?: "events" | "sessions";
  };
  pastMinutes?: number;
  minutes?: number; // Alternative name for pastMinutes for compatibility
  pastMinutesRange?: { start: number; end: number };
}) {
  // For backward compatibility, support both minutes and pastMinutes
  const actualPastMinutes = pastMinutes || minutes;

  // Sanitize inputs with Zod
  const sanitized = validateTimeStatementParams({
    date,
    pastMinutes: actualPastMinutes,
    pastMinutesRange,
  });

  if (sanitized.date) {
    const { startDate, endDate, timezone } = sanitized.date;
    if (!startDate && !endDate) {
      return "";
    }

    // Use SqlString.escape for date and timezone values
    return `AND timestamp >= toTimeZone(
      toStartOfDay(toDateTime(${SqlString.escape(
        startDate
      )}, ${SqlString.escape(timezone)})),
      'UTC'
      )
      AND timestamp < if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(
      timezone
    )}),
        now(),
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(
            endDate
          )}, ${SqlString.escape(timezone)})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;
  }

  // Handle specific range of past minutes
  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;
    return `AND timestamp > now() - interval ${SqlString.escape(
      start
    )} minute AND timestamp <= now() - interval ${SqlString.escape(
      end
    )} minute`;
  }

  // Handle standard past minutes
  if (sanitized.pastMinutes) {
    // Use SqlString.escape for pastMinutes (it handles numbers)
    return `AND timestamp > now() - interval ${SqlString.escape(
      sanitized.pastMinutes
    )} minute`;
  }

  // If no valid time parameters were provided, return empty string
  return "";
}

export async function processResults<T>(
  results: ResultSet<"JSONEachRow">
): Promise<T[]> {
  const data: T[] = await results.json();
  for (const row of data) {
    for (const key in row) {
      if (!isNaN(Number(row[key])) && row[key] !== "") {
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
  return filterParamSchema.parse(parameter);
};

export function getFilterStatement(filters: string) {
  if (!filters) {
    return "";
  }

  // Sanitize inputs with Zod
  const filtersArray = validateFilters(filters);

  if (filtersArray.length === 0) {
    return "";
  }

  return (
    "AND " +
    filtersArray
      .map((filter) => {
        const x =
          filter.type === "contains" || filter.type === "not_contains"
            ? "%"
            : "";

        if (filter.parameter === "entry_page") {
          if (filter.value.length === 1) {
            return `session_id IN (
              SELECT session_id 
              FROM (
                SELECT 
                  session_id, 
                  argMin(pathname, timestamp) AS entry_pathname
                FROM events 
                GROUP BY session_id
              ) 
              WHERE entry_pathname ${filterTypeToOperator(
                filter.type
              )} ${SqlString.escape(x + filter.value[0] + x)}
            )`;
          }

          const valuesWithOperator = filter.value.map(
            (value) =>
              `entry_pathname ${filterTypeToOperator(
                filter.type
              )} ${SqlString.escape(x + value + x)}`
          );

          return `session_id IN (
            SELECT session_id 
            FROM (
              SELECT 
                session_id, 
                argMin(pathname, timestamp) AS entry_pathname
              FROM events 
              GROUP BY session_id
            ) 
            WHERE (${valuesWithOperator.join(" OR ")})
          )`;
        }

        if (filter.parameter === "exit_page") {
          if (filter.value.length === 1) {
            return `session_id IN (
              SELECT session_id 
              FROM (
                SELECT 
                  session_id, 
                  argMax(pathname, timestamp) AS exit_pathname
                FROM events 
                GROUP BY session_id
              ) 
              WHERE exit_pathname ${filterTypeToOperator(
                filter.type
              )} ${SqlString.escape(x + filter.value[0] + x)}
            )`;
          }

          const valuesWithOperator = filter.value.map(
            (value) =>
              `exit_pathname ${filterTypeToOperator(
                filter.type
              )} ${SqlString.escape(x + value + x)}`
          );

          return `session_id IN (
            SELECT session_id 
            FROM (
              SELECT 
                session_id, 
                argMax(pathname, timestamp) AS exit_pathname
              FROM events 
              GROUP BY session_id
            ) 
            WHERE (${valuesWithOperator.join(" OR ")})
          )`;
        }

        if (filter.value.length === 1) {
          return `${getSqlParam(filter.parameter)} ${filterTypeToOperator(
            filter.type
          )} ${SqlString.escape(x + filter.value[0] + x)}`;
        }

        const valuesWithOperator = filter.value.map(
          (value) =>
            `${getSqlParam(filter.parameter)} ${filterTypeToOperator(
              filter.type
            )} ${SqlString.escape(x + value + x)}`
        );

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
