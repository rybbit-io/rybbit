import { FilterParameter } from "../types.js";
import { getFilterStatement } from "./getFilterStatement.js";
import { validateFilters } from "./query-validation.js";
import { SESSION_REFERRER_AGG } from "./sessionAttribution.js";

// These fields are event-scoped rather than stable session attributes. Session
// reports include a session when any event matches them; channel has its own
// acquisition aggregation inside getFilterStatement.
const SESSION_EVENT_LEVEL_PARAMS: FilterParameter[] = [
  "event_name",
  "pathname",
  "page_title",
  "querystring",
  "channel",
];

// Session aggregates expose UTM values as aliases instead of Map lookups.
const SESSION_FIELD_MAPPINGS = {
  "url_parameters['utm_source']": "utm_source",
  "url_parameters['utm_medium']": "utm_medium",
  "url_parameters['utm_campaign']": "utm_campaign",
  "url_parameters['utm_term']": "utm_term",
  "url_parameters['utm_content']": "utm_content",
};

// Attributes that describe the measured event itself on target-event reports.
// Acquisition and cohort fields (UTM, referrer, channel, entry/exit, identity,
// feature flags) remain session qualifiers.
export const TARGET_EVENT_ROW_LEVEL_PARAMS: readonly FilterParameter[] = [
  "hostname",
  "browser",
  "browser_version",
  "operating_system",
  "operating_system_version",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "pathname",
  "page_title",
  "querystring",
  "dimensions",
  "lat",
  "lon",
  "timezone",
  "tag",
];

export const getSessionFilterStatement = (filters: string | undefined, siteId: number, timeStatement: string) =>
  getFilterStatement(filters ?? "", siteId, timeStatement, {
    sessionLevelParams: SESSION_EVENT_LEVEL_PARAMS,
    fieldMappings: SESSION_FIELD_MAPPINGS,
  });

/**
 * Builds one row per session and applies filters to those session attributes.
 * Analytics queries use the resulting IDs so a landing-page filter and a later
 * target event can match the same session without occurring on the same row.
 */
export const buildFilteredSessionsCTE = (
  filters: string | undefined,
  siteId: number,
  timeStatement: string,
  cteName = "FilteredSessions"
): string | null => {
  if (!filters) return null;

  const parsedFilters = validateFilters(filters);
  if (parsedFilters.length === 0) return null;

  const filterStatement = getSessionFilterStatement(filters, siteId, timeStatement);
  if (!filterStatement) return null;

  const aggregates = new Set<string>();
  const subqueryOnlyParams = new Set<FilterParameter>([...SESSION_EVENT_LEVEL_PARAMS, "entry_page", "exit_page"]);

  for (const { parameter } of parsedFilters) {
    if (subqueryOnlyParams.has(parameter)) continue;

    if (parameter === "user_id") {
      aggregates.add("argMax(user_id, timestamp) AS user_id");
      aggregates.add("argMax(identified_user_id, timestamp) AS identified_user_id");
    } else if (parameter === "referrer") {
      aggregates.add(`${SESSION_REFERRER_AGG} AS referrer`);
    } else if (parameter.startsWith("utm_")) {
      aggregates.add(`argMin(url_parameters, timestamp)['${parameter}'] AS ${parameter}`);
    } else if (parameter === "hostname") {
      aggregates.add("argMin(hostname, timestamp) AS hostname");
    } else if (parameter === "dimensions") {
      aggregates.add("argMax(screen_width, timestamp) AS screen_width");
      aggregates.add("argMax(screen_height, timestamp) AS screen_height");
    } else if (parameter === "city") {
      aggregates.add("argMax(region, timestamp) AS region");
      aggregates.add("argMax(city, timestamp) AS city");
    } else if (parameter === "browser_version") {
      aggregates.add("argMax(browser, timestamp) AS browser");
      aggregates.add("argMax(browser_version, timestamp) AS browser_version");
    } else if (parameter === "operating_system_version") {
      aggregates.add("argMax(operating_system, timestamp) AS operating_system");
      aggregates.add("argMax(operating_system_version, timestamp) AS operating_system_version");
    } else if (parameter.startsWith("feature_flag:")) {
      aggregates.add("argMax(feature_flags, timestamp) AS feature_flags");
    } else {
      aggregates.add(`argMax(${parameter}, timestamp) AS ${parameter}`);
    }
  }

  const aggregateProjection = aggregates.size ? `,\n          ${[...aggregates].join(",\n          ")}` : "";

  return `${cteName} AS (
      SELECT session_id
      FROM (
        SELECT
          session_id${aggregateProjection}
        FROM events
        WHERE site_id = ${siteId}
          ${timeStatement}
        GROUP BY session_id
      )
      WHERE 1 = 1 ${filterStatement}
    )`;
};

/**
 * Splits filters for reports that select target event rows inside a qualifying
 * session. Parameters listed in `rowLevelParams` still constrain the measured
 * event; every other parameter qualifies the session first.
 */
export const buildSessionAndRowFilterFragments = (
  filters: string | undefined,
  siteId: number,
  timeStatement: string,
  rowLevelParams: readonly FilterParameter[],
  cteName = "FilteredSessions"
): { filteredSessionsCTE: string | null; rowFilterStatement: string } => {
  if (!filters) {
    return { filteredSessionsCTE: null, rowFilterStatement: "" };
  }

  const parsedFilters = validateFilters(filters);
  const rowFilters = parsedFilters.filter(filter => rowLevelParams.includes(filter.parameter));
  const sessionFilters = parsedFilters.filter(filter => !rowLevelParams.includes(filter.parameter));

  const filteredSessionsCTE = sessionFilters.length
    ? buildFilteredSessionsCTE(JSON.stringify(sessionFilters), siteId, timeStatement, cteName)
    : null;
  const rowFilterStatement = rowFilters.length
    ? getFilterStatement(JSON.stringify(rowFilters), siteId, timeStatement, { sessionLevelParams: [] })
    : "";

  return { filteredSessionsCTE, rowFilterStatement };
};
