import { FilterParameter } from "../types.js";
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
export type BotDimensionKey =
  | FilterParameter
  | "asn_org"
  | "asn_provider"
  | "bot_category"
  | "bot_name"
  | "bot_operator"
  | "bot_purpose"
  | "matched_ua_pattern";

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
  "asn_provider",
  "bot_category",
  "bot_name",
  "bot_operator",
  "bot_purpose",
  "matched_ua_pattern",
]);

/**
 * Purposes that count as AI traffic. Grouped rather than enumerated at every
 * call site so "AI" means one thing across the overview, the chart and every
 * breakdown on the page.
 */
export const AI_BOT_PURPOSES = ["ai_training", "ai_search", "ai_agent"] as const;
export const AI_CRAWLER_PURPOSES = ["ai_training", "ai_search"] as const;

const quoteList = (values: readonly string[]) => values.map(value => `'${value}'`).join(", ");

export const AI_PURPOSE_SQL_LIST = quoteList(AI_BOT_PURPOSES);
export const AI_CRAWLER_PURPOSE_SQL_LIST = quoteList(AI_CRAWLER_PURPOSES);

const BOT_PURPOSES = new Set<string>([
  ...AI_BOT_PURPOSES,
  "search",
  "social_preview",
  "seo",
  "monitoring",
  "security",
  "scripted",
  "headless",
]);

/**
 * Narrows a bot query to one purpose, or to the whole AI family with `"ai"`.
 *
 * Purpose is not a filter parameter — it exists only on the bot tables and has
 * no equivalent on the events surface — so it takes the same dedicated-clause
 * route `layer` does rather than going through the filter allowlist.
 */
export function getBotPurposeStatement(purpose?: string | null) {
  if (!purpose) {
    return "";
  }
  if (purpose === "ai") {
    return `AND bot_purpose IN (${AI_PURPOSE_SQL_LIST})`;
  }
  if (purpose === "ai_crawler") {
    return `AND bot_purpose IN (${AI_CRAWLER_PURPOSE_SQL_LIST})`;
  }
  return BOT_PURPOSES.has(purpose) ? `AND bot_purpose = '${purpose}'` : "";
}

export function getBotLayerStatement(layer?: string | null) {
  if (!layer) {
    return "";
  }

  const column = BOT_LAYER_COLUMNS[layer as BotLayerKey];
  return column ? `AND ${column}` : "";
}

// Dimension keys that only exist on bot_events; everything else shares the
// events-surface column expressions from getSqlParam.
const BOT_ONLY_DIMENSIONS = new Set<BotDimensionKey>([
  "asn_org",
  "asn_provider",
  "bot_category",
  "bot_name",
  "bot_operator",
  "bot_purpose",
  "matched_ua_pattern",
]);

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

