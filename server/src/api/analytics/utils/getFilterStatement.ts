import SqlString from "sqlstring";
import { filterParamSchema, validateFilters } from "./query-validation.js";
import { SESSION_CHANNEL_AGG } from "./sessionAttribution.js";
import { FilterParameter, FilterType } from "../types.js";

// Options for customizing filter behavior
export interface FilterStatementOptions {
  // Parameters that should use session-level subqueries (finds sessions containing matching events)
  // Default: ["event_name", "channel"] - entry_page and exit_page are always session-level due to special aggregation
  // Channel is handled as a session acquisition field using the session's first attributed channel
  // (SESSION_CHANNEL_AGG), matching how session views derive their channel.
  sessionLevelParams?: FilterParameter[];

  // Field name mappings for CTEs that extract fields to different column names
  // e.g., { "url_parameters['utm_source']": "utm_source" }
  // Keys must exactly match the emitted column expression (the getSqlParam
  // output); the mapping is applied where column identifiers are produced, so
  // user-supplied filter values are never rewritten.
  fieldMappings?: Record<string, string>;
}

const DEFAULT_SESSION_LEVEL_PARAMS: FilterParameter[] = ["event_name", "channel"];

const filterTypeToOperator = (type: FilterType) => {
  switch (type) {
    case "equals":
      return "=";
    case "not_equals":
      return "!=";
    case "contains":
    case "starts_with":
    case "ends_with":
      return "LIKE";
    case "not_contains":
      return "NOT LIKE";
    case "greater_than":
      return ">";
    case "less_than":
      return "<";
    case "greater_than_or_equal":
      return ">=";
    case "less_than_or_equal":
      return "<=";
    case "regex":
    case "not_regex":
    case "is_null":
    case "is_not_null":
      return null;
  }
};

// Escape LIKE pattern metacharacters in user-supplied values so they match
// literally. Only the % wildcards that wrapLikeValue itself adds around the
// value remain functional.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

const wrapLikeValue = (type: FilterType, value: string | number): string => {
  const v = String(value);
  if (type === "contains" || type === "not_contains") return `%${escapeLikePattern(v)}%`;
  if (type === "starts_with") return `${escapeLikePattern(v)}%`;
  if (type === "ends_with") return `%${escapeLikePattern(v)}`;
  return v;
};

export const getSqlParam = (parameter: FilterParameter) => {
  if (parameter.startsWith("feature_flag:")) {
    const key = parameter.substring("feature_flag:".length);
    return `feature_flags[${SqlString.escape(key)}]`;
  }

  // Handle URL parameters through the url_parameters map.
  // The map key is attacker-controlled, so it must be escaped (matching the
  // feature_flag branch above) — not raw-interpolated — to prevent SQL injection.
  if (parameter.startsWith("utm_") || parameter.startsWith("url_param:")) {
    // For explicit url_param: prefix (e.g., url_param:campaign_id)
    if (parameter.startsWith("url_param:")) {
      const paramName = parameter.substring("url_param:".length);
      return `url_parameters[${SqlString.escape(paramName)}]`;
    }

    const utm = parameter; // e.g., utm_source, utm_medium, etc.
    return `url_parameters[${SqlString.escape(utm)}]`;
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

export function getFilterStatement(
  filters: string,
  siteId?: number,
  timeStatement?: string,
  options?: FilterStatementOptions
) {
  if (!filters) {
    return "";
  }

  // Sanitize inputs with Zod
  const filtersArray = validateFilters(filters);

  if (filtersArray.length === 0) {
    return "";
  }

  const sessionLevelParams = options?.sessionLevelParams ?? DEFAULT_SESSION_LEVEL_PARAMS;

  // Map an emitted column expression to its CTE alias, if the caller provided
  // one. Applied at column-identifier emission time — never as a rewrite over
  // finished SQL — so user-supplied values can't be affected.
  const mapField = (expression: string): string => options?.fieldMappings?.[expression] ?? expression;

  const siteIdFilter = siteId ? `site_id = ${siteId}` : "";
  // Strip leading "AND " from timeStatement since we'll be constructing WHERE clauses
  const timeFilter = timeStatement ? timeStatement.replace(/^AND\s+/i, "").trim() : "";

  const buildStringFilterCondition = (
    expression: string,
    filterType: FilterType,
    values: (string | number)[],
    _legacyWildcardPrefix?: string
  ): string => {
    if (filterType === "is_null") {
      return `(${expression} IS NULL OR ${expression} = '')`;
    }
    if (filterType === "is_not_null") {
      return `(${expression} IS NOT NULL AND ${expression} != '')`;
    }

    if (filterType === "regex" || filterType === "not_regex") {
      const pattern = String(values[0] ?? "");

      if (!pattern) {
        throw new Error("Regex pattern cannot be empty");
      }

      try {
        new RegExp(pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${e instanceof Error ? e.message : "Unknown error"}`);
      }

      if (pattern.length > 500) {
        throw new Error("Regex pattern too long (max 500 characters)");
      }

      const matchExpr = `match(${expression}, ${SqlString.escape(pattern)})`;
      return filterType === "regex" ? matchExpr : `NOT ${matchExpr}`;
    }

    const op = filterTypeToOperator(filterType);
    // Negative filters must AND-join across values (NOT IN semantics): OR-joining
    // negations is a tautology — (x != 'a' OR x != 'b') matches every row.
    const joiner = filterType === "not_equals" || filterType === "not_contains" ? " AND " : " OR ";
    const condition =
      values.length === 1
        ? `${expression} ${op} ${SqlString.escape(wrapLikeValue(filterType, values[0]))}`
        : `(${values
            .map(value => `${expression} ${op} ${SqlString.escape(wrapLikeValue(filterType, value))}`)
            .join(joiner)})`;

    return condition;
  };

  // Helper to build session-level subquery for a parameter
  const buildSessionLevelSubquery = (
    param: FilterParameter,
    filterType: FilterType,
    values: (string | number)[],
    wildcardPrefix: string
  ): string => {
    const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
    // getSqlParam keeps transformed params (city, browser_version, ...) correct
    // inside the subquery. fieldMappings deliberately do NOT apply here: the
    // subquery selects from the raw events table, where the caller's CTE
    // aliases don't exist.
    const condition = buildStringFilterCondition(getSqlParam(param), filterType, values, wildcardPrefix);

    const finalWhere = whereClause ? `WHERE ${whereClause} AND ${condition}` : `WHERE ${condition}`;

    return `session_id IN (
            SELECT DISTINCT session_id
            FROM events
            ${finalWhere}
          )`;
  };

  const buildSessionChannelSubquery = (
    filterType: FilterType,
    values: (string | number)[],
    wildcardPrefix: string
  ): string => {
    const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
    const whereStatement = whereClause ? `WHERE ${whereClause}` : "";
    const condition = buildStringFilterCondition("session_channel", filterType, values, wildcardPrefix);

    return `session_id IN (
            SELECT session_id
            FROM (
              SELECT
                session_id,
                ${SESSION_CHANNEL_AGG} AS session_channel
              FROM events
              ${whereStatement}
              GROUP BY session_id
            )
            WHERE ${condition}
          )`;
  };

  const result =
    "AND " +
    filtersArray
      .map(filter => {
        const x = filter.type === "contains" || filter.type === "not_contains" ? "%" : "";
        const isNumericParam = filter.parameter === "lat" || filter.parameter === "lon";
        const isNullCheck = filter.type === "is_null" || filter.type === "is_not_null";

        // Handle session-level filters (configurable via options).
        // Most parameters match sessions containing an event; channel uses the session's first attributed value.
        if (sessionLevelParams.includes(filter.parameter)) {
          if (filter.parameter === "channel") {
            return buildSessionChannelSubquery(filter.type, filter.value, x);
          }

          return buildSessionLevelSubquery(filter.parameter, filter.type, filter.value, x);
        }

        if (filter.parameter === "entry_page") {
          const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
          const whereStatement = whereClause ? `WHERE ${whereClause}` : "";
          const condition = buildStringFilterCondition("entry_pathname", filter.type, filter.value);

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
            WHERE ${condition}
          )`;
        }

        if (filter.parameter === "exit_page") {
          const whereClause = [siteIdFilter, timeFilter].filter(Boolean).join(" AND ");
          const whereStatement = whereClause ? `WHERE ${whereClause}` : "";
          const condition = buildStringFilterCondition("exit_pathname", filter.type, filter.value);

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
            WHERE ${condition}
          )`;
        }

        // Special handling for user_id to also check identified_user_id
        // This is needed because URLs may contain either the device fingerprint (user_id)
        // or the custom identified user ID (identified_user_id)
        if (filter.parameter === "user_id") {
          if (filter.type === "is_null") {
            return `((user_id IS NULL OR user_id = '') AND (identified_user_id IS NULL OR identified_user_id = ''))`;
          }
          if (filter.type === "is_not_null") {
            return `((user_id IS NOT NULL AND user_id != '') OR (identified_user_id IS NOT NULL AND identified_user_id != ''))`;
          }
          if (filter.type === "equals" || filter.type === "not_equals") {
            if (filter.value.length === 1) {
              const escapedValue = SqlString.escape(filter.value[0]);
              if (filter.type === "equals") {
                return `(user_id = ${escapedValue} OR identified_user_id = ${escapedValue})`;
              }
              return `(user_id != ${escapedValue} AND identified_user_id != ${escapedValue})`;
            }

            const conditions = filter.value.map(value => {
              const escapedValue = SqlString.escape(value);
              if (filter.type === "equals") {
                return `(user_id = ${escapedValue} OR identified_user_id = ${escapedValue})`;
              }
              return `(user_id != ${escapedValue} AND identified_user_id != ${escapedValue})`;
            });

            if (filter.type === "equals") {
              return `(${conditions.join(" OR ")})`;
            }
            return `(${conditions.join(" AND ")})`;
          }
        }

        if (isNullCheck) {
          return buildStringFilterCondition(mapField(getSqlParam(filter.parameter)), filter.type, filter.value);
        }

        if (filter.type === "regex" || filter.type === "not_regex") {
          return buildStringFilterCondition(mapField(getSqlParam(filter.parameter)), filter.type, filter.value, x);
        }

        // Handle numeric comparison filters (>, <, >=, <=)
        if (
          filter.type === "greater_than" ||
          filter.type === "less_than" ||
          filter.type === "greater_than_or_equal" ||
          filter.type === "less_than_or_equal"
        ) {
          const numericValue = Number(filter.value[0]);
          if (isNaN(numericValue)) {
            throw new Error(`Invalid numeric value for ${filter.type} filter: ${filter.value[0]}`);
          }
          return `${mapField(getSqlParam(filter.parameter))} ${filterTypeToOperator(filter.type)} ${numericValue}`;
        }

        if (filter.type === "starts_with" || filter.type === "ends_with") {
          return buildStringFilterCondition(mapField(getSqlParam(filter.parameter)), filter.type, filter.value);
        }

        // Special handling for lat/lon with tolerance (only for equals/not_equals)
        if (filter.parameter === "lat" || filter.parameter === "lon") {
          const tolerance = 0.001;
          const column = mapField(getSqlParam(filter.parameter));
          const rangeConditions = filter.value.map(value => {
            const targetValue = Number(value);
            return `(${column} >= ${targetValue - tolerance} AND ${column} <= ${targetValue + tolerance})`;
          });
          const rangeCondition =
            rangeConditions.length === 1 ? rangeConditions[0] : `(${rangeConditions.join(" OR ")})`;
          return filter.type === "not_equals" ? `NOT ${rangeCondition}` : rangeCondition;
        }

        if (filter.value.length === 1) {
          const value = isNumericParam
            ? filter.value[0]
            : SqlString.escape(wrapLikeValue(filter.type, filter.value[0]));
          return `${mapField(getSqlParam(filter.parameter))} ${filterTypeToOperator(filter.type)} ${value}`;
        }

        // Negative filters must AND-join across values (NOT IN semantics): OR-joining
        // negations is a tautology — (x != 'a' OR x != 'b') matches every row.
        const joiner = filter.type === "not_equals" || filter.type === "not_contains" ? " AND " : " OR ";
        const valuesWithOperator = filter.value.map(value => {
          const escapedValue = isNumericParam ? value : SqlString.escape(wrapLikeValue(filter.type, value));
          return `${mapField(getSqlParam(filter.parameter))} ${filterTypeToOperator(filter.type)} ${escapedValue}`;
        });

        return `(${valuesWithOperator.join(joiner)})`;
      })
      .join(" AND ");

  return result;
}
