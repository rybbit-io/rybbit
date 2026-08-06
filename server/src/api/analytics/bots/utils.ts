import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { FilterParameter, TimeBucket } from "../types.js";
import { getFilterStatement, getSqlParam } from "../utils/getFilterStatement.js";
import { validateTimeStatementFillParams } from "../utils/query-validation.js";
import { bucketIntervalMap, normalizeDatetimeForClickhouse, TimeBucketToFn } from "../utils/utils.js";

// Condition rendering is shared with the events surface; re-exported here for
// existing importers and tests.
export { buildStringFilterCondition } from "../utils/getFilterStatement.js";

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

// Dimension keys that only exist on bot_events; everything else shares the
// events-surface column expressions from getSqlParam.
const BOT_ONLY_DIMENSIONS = new Set<BotDimensionKey>(["asn_org", "bot_category", "matched_ua_pattern"]);

export const getBotSqlParam = (parameter: BotDimensionKey) => {
  if (BOT_ONLY_DIMENSIONS.has(parameter)) {
    return parameter;
  }
  return getSqlParam(parameter as FilterParameter);
};

// bot_events is a flat table: no session-level subqueries, no
// identified_user_id column, and only a subset of the filterable parameters.
export function getBotFilterStatement(filters?: string) {
  return getFilterStatement(filters || "", undefined, undefined, {
    sessionLevelParams: [],
    parameterAllowlist: BOT_FILTER_PARAMETERS,
    dualUserIdColumns: false,
  });
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
