import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { FilterParameter, FilterType, TimeBucket } from "../types.js";
import { validateFilters, validateTimeStatementFillParams } from "../utils/query-validation.js";
import { bucketIntervalMap, normalizeDatetimeForClickhouse, TimeBucketToFn } from "../utils/utils.js";

export const BOT_LAYER_COLUMNS = {
  ua_pattern: "detected_ua_pattern",
  header_heuristics: "detected_header_heuristics",
  client_signals: "detected_client_signals",
  bot_asn: "detected_bot_asn",
  rate_anomaly: "detected_rate_anomaly",
} as const;

export type BotLayerKey = keyof typeof BOT_LAYER_COLUMNS;
export type BotDimensionKey = FilterParameter | "asn_org" | "bot_category" | "matched_ua_pattern";

const BOT_FILTER_PARAMETERS = new Set<FilterParameter>([
  "browser",
  "browser_version",
  "operating_system",
  "operating_system_version",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "hostname",
  "pathname",
  "querystring",
  "dimensions",
  "user_id",
  "lat",
  "lon",
]);

export const BOT_DIMENSIONS = new Set<BotDimensionKey>([
  "browser",
  "browser_version",
  "operating_system",
  "operating_system_version",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "hostname",
  "pathname",
  "dimensions",
  "asn_org",
  "bot_category",
  "matched_ua_pattern",
]);

export function getBotLayerStatement(layer?: string | null) {
  if (!layer) {
    return "";
  }

  const column = BOT_LAYER_COLUMNS[layer as BotLayerKey];
  return column ? `AND ${column}` : "";
}

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

const wrapLikeValue = (type: FilterType, value: string | number): string => {
  const v = String(value);
  if (type === "contains" || type === "not_contains") return `%${v}%`;
  if (type === "starts_with") return `${v}%`;
  if (type === "ends_with") return `%${v}`;
  return v;
};

export const getBotSqlParam = (parameter: BotDimensionKey) => {
  if (parameter === "referrer") {
    return "domainWithoutWWW(referrer)";
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
  return parameter;
};

const buildStringFilterCondition = (expression: string, filterType: FilterType, values: (string | number)[]) => {
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
    new RegExp(pattern);
    if (pattern.length > 500) {
      throw new Error("Regex pattern too long (max 500 characters)");
    }
    const matchExpr = `match(${expression}, ${SqlString.escape(pattern)})`;
    return filterType === "regex" ? matchExpr : `NOT ${matchExpr}`;
  }

  const op = filterTypeToOperator(filterType);
  const joiner = filterType === "not_equals" || filterType === "not_contains" ? " AND " : " OR ";
  const conditions = values.map(value => `${expression} ${op} ${SqlString.escape(wrapLikeValue(filterType, value))}`);
  return conditions.length === 1 ? conditions[0] : `(${conditions.join(joiner)})`;
};

export function getBotFilterStatement(filters?: string) {
  if (!filters) {
    return "";
  }

  const filtersArray = validateFilters(filters).filter(filter => BOT_FILTER_PARAMETERS.has(filter.parameter));
  if (filtersArray.length === 0) {
    return "";
  }

  const conditions = filtersArray.map(filter => {
    const expression = getBotSqlParam(filter.parameter);
    if (filter.type === "is_null" || filter.type === "is_not_null") {
      return buildStringFilterCondition(expression, filter.type, filter.value);
    }

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
      return `${expression} ${filterTypeToOperator(filter.type)} ${numericValue}`;
    }

    if (filter.parameter === "lat" || filter.parameter === "lon") {
      const tolerance = 0.001;
      const rangeConditions = filter.value.map(value => {
        const targetValue = Number(value);
        return `(${filter.parameter} >= ${targetValue - tolerance} AND ${filter.parameter} <= ${targetValue + tolerance})`;
      });
      const rangeCondition = rangeConditions.length === 1 ? rangeConditions[0] : `(${rangeConditions.join(" OR ")})`;
      return filter.type === "not_equals" ? `NOT ${rangeCondition}` : rangeCondition;
    }

    return buildStringFilterCondition(expression, filter.type, filter.value);
  });

  return `AND ${conditions.join(" AND ")}`;
}

export function getBotTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.start_date && validatedParams.end_date && validatedParams.time_zone) {
    const { start_date, end_date, time_zone } = validatedParams;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(
        time_zone
      )}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        toTimeZone(now(), 'UTC'),
        toTimeZone(
          toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(
            time_zone
          )}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  if (validatedParams.start_datetime && validatedParams.end_datetime && validatedParams.time_zone) {
    const { start_datetime, end_datetime, time_zone } = validatedParams;
    const normalizedStartDatetime = normalizeDatetimeForClickhouse(start_datetime);
    const normalizedEndDatetime = normalizeDatetimeForClickhouse(end_datetime);
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[validatedBucket]}(toTimeZone(toDateTime(${SqlString.escape(
        normalizedStartDatetime
      )}, 'UTC'), ${SqlString.escape(time_zone)}))),
      'UTC'
      )
      TO toTimeZone(
        toDateTime(${TimeBucketToFn[validatedBucket]}(toTimeZone(toDateTime(${SqlString.escape(
          normalizedEndDatetime
        )}, 'UTC'), ${SqlString.escape(time_zone)}))),
        'UTC'
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  if (validatedParams.past_minutes_start !== undefined && validatedParams.past_minutes_end !== undefined) {
    const { past_minutes_start: start, past_minutes_end: end } = validatedParams;
    const now = new Date();
    const startIso = new Date(now.getTime() - start * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const endIso = new Date(now.getTime() - end * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

    return `WITH FILL
      FROM ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(startIso)}))
      TO ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(endIso)})) + INTERVAL 1 ${
        validatedBucket === "month"
          ? "MONTH"
          : validatedBucket === "week"
            ? "WEEK"
            : validatedBucket === "day"
              ? "DAY"
              : validatedBucket === "hour"
                ? "HOUR"
                : "MINUTE"
      }
      STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  return "";
}
