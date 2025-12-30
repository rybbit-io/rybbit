import SqlString from "sqlstring";
import { filterParamSchema, validateFilters } from "./query-validation.js";
import { FilterParameter, FilterType } from "../types.js";

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
    case "greater_than":
      return ">";
    case "less_than":
      return "<";
    case "regex":
    case "not_regex":
      return null; // Handled separately with match() function
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

        // Special handling for user_id to also check identified_user_id
        // This is needed because URLs may contain either the device fingerprint (user_id)
        // or the custom identified user ID (identified_user_id)
        if (filter.parameter === "user_id") {
          if (filter.value.length === 1) {
            const escapedValue = SqlString.escape(filter.value[0]);
            if (filter.type === "equals") {
              return `(user_id = ${escapedValue} OR identified_user_id = ${escapedValue})`;
            } else if (filter.type === "not_equals") {
              return `(user_id != ${escapedValue} AND identified_user_id != ${escapedValue})`;
            }
          }

          const conditions = filter.value.map(value => {
            const escapedValue = SqlString.escape(value);
            if (filter.type === "equals") {
              return `(user_id = ${escapedValue} OR identified_user_id = ${escapedValue})`;
            } else {
              return `(user_id != ${escapedValue} AND identified_user_id != ${escapedValue})`;
            }
          });

          if (filter.type === "equals") {
            return `(${conditions.join(" OR ")})`;
          } else {
            return `(${conditions.join(" AND ")})`;
          }
        }

        // Handle regex filters using ClickHouse match() function
        if (filter.type === "regex" || filter.type === "not_regex") {
          const pattern = String(filter.value[0] ?? "");

          // Validate regex pattern
          if (!pattern) {
            throw new Error("Regex pattern cannot be empty");
          }

          // Check if it's a valid regex by trying to compile it
          try {
            new RegExp(pattern);
          } catch (e) {
            throw new Error(`Invalid regex pattern: ${e instanceof Error ? e.message : "Unknown error"}`);
          }

          // Additional safety: limit pattern length to prevent abuse
          if (pattern.length > 500) {
            throw new Error("Regex pattern too long (max 500 characters)");
          }

          const regexPattern = SqlString.escape(pattern);
          const matchExpr = `match(${getSqlParam(filter.parameter)}, ${regexPattern})`;
          return filter.type === "regex" ? matchExpr : `NOT ${matchExpr}`;
        }

        // Handle numeric comparison filters (>, <)
        if (filter.type === "greater_than" || filter.type === "less_than") {
          const numericValue = Number(filter.value[0]);
          if (isNaN(numericValue)) {
            throw new Error(`Invalid numeric value for ${filter.type} filter: ${filter.value[0]}`);
          }
          return `${getSqlParam(filter.parameter)} ${filterTypeToOperator(filter.type)} ${numericValue}`;
        }

        // Special handling for lat/lon with tolerance (only for equals/not_equals)
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
