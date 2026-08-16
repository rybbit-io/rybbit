import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { FilterParameter, TimeBucket } from "../types.js";
import { getFilterStatement, getSqlParam } from "../utils/getFilterStatement.js";

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
