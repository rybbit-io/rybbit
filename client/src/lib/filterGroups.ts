import { FilterParameter } from "@rybbit/shared";

const WEB_ONLY_FILTERS: FilterParameter[] = [
  "hostname",
  "querystring",
  "channel",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "tag",
];

const APP_ONLY_FILTERS: FilterParameter[] = [
  "device_model",
  "app_version",
];

const COMMON_FILTERS: FilterParameter[] = [
  "browser",
  "browser_version",
  "operating_system",
  "operating_system_version",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "page_title",
  "dimensions",
  "user_id",
  "lat",
  "lon",
];

function getBaseFilters(isApp: boolean): FilterParameter[] {
  if (isApp) {
    return [...APP_ONLY_FILTERS, ...COMMON_FILTERS];
  }
  return [...WEB_ONLY_FILTERS, ...COMMON_FILTERS];
}

export function getSessionPageFilters(isApp: boolean): FilterParameter[] {
  return [...getBaseFilters(isApp), "pathname", "entry_page", "exit_page", "event_name"];
}

export function getEventFilters(isApp: boolean): FilterParameter[] {
  return [...getBaseFilters(isApp), "pathname", "event_name", "entry_page", "exit_page"];
}

export function getGoalsPageFilters(isApp: boolean): FilterParameter[] {
  return [...getBaseFilters(isApp)];
}

export function getFunnelPageFilters(isApp: boolean): FilterParameter[] {
  return [...getBaseFilters(isApp)];
}

export function getUserPageFilters(isApp: boolean): FilterParameter[] {
  const base: FilterParameter[] = [
    "browser",
    "browser_version",
    "operating_system",
    "operating_system_version",
    "language",
    "country",
    "region",
    "city",
    "device_type",
    "user_id",
  ];
  if (isApp) {
    return ["device_model", "app_version", ...base, "pathname", "entry_page", "exit_page"];
  }
  return ["hostname", "referrer", ...base, "pathname", "entry_page", "exit_page"];
}

export function getJourneyPageFilters(isApp: boolean): FilterParameter[] {
  const base: FilterParameter[] = [
    "browser",
    "operating_system",
    "language",
    "country",
    "region",
    "city",
    "device_type",
    "entry_page",
    "exit_page",
    "dimensions",
    "browser_version",
    "operating_system_version",
    "user_id",
    "lat",
    "lon",
  ];
  if (isApp) {
    return ["device_model", "app_version", ...base];
  }
  return [
    "hostname",
    "referrer",
    // "channel",
    // "utm_source",
    // "utm_medium",
    // "utm_campaign",
    // "utm_term",
    // "utm_content",
    ...base,
  ];
}

export function getSessionReplayPageFilters(isApp: boolean): FilterParameter[] {
  const base: FilterParameter[] = [
    "browser",
    "browser_version",
    "operating_system",
    "operating_system_version",
    "language",
    "country",
    "region",
    "city",
    "device_type",
    "user_id",
  ];
  if (isApp) {
    return ["device_model", "app_version", ...base];
  }
  return ["hostname", "referrer", "channel", ...base];
}

// Static exports used by API hooks - include ALL filters (web + app union)
// so that any active filter passes through regardless of site type.
// The SubHeader UI uses the dynamic getter functions above to show only relevant filters.
function allFilters(...arrays: FilterParameter[][]): FilterParameter[] {
  return [...new Set(arrays.flat())];
}
export const SESSION_PAGE_FILTERS: FilterParameter[] = allFilters(getSessionPageFilters(false), getSessionPageFilters(true));
// Single-user detail page: the page is already scoped to one user, so the
// user_id filter is excluded.
export const USER_DETAIL_PAGE_FILTERS: FilterParameter[] = SESSION_PAGE_FILTERS.filter(f => f !== "user_id");
export const EVENT_FILTERS: FilterParameter[] = allFilters(getEventFilters(false), getEventFilters(true));
export const GOALS_PAGE_FILTERS: FilterParameter[] = allFilters(getGoalsPageFilters(false), getGoalsPageFilters(true));
export const FUNNEL_PAGE_FILTERS: FilterParameter[] = allFilters(getFunnelPageFilters(false), getFunnelPageFilters(true));
export const USER_PAGE_FILTERS: FilterParameter[] = allFilters(getUserPageFilters(false), getUserPageFilters(true));
export const JOURNEY_PAGE_FILTERS: FilterParameter[] = allFilters(getJourneyPageFilters(false), getJourneyPageFilters(true));
export const SESSION_REPLAY_PAGE_FILTERS: FilterParameter[] = allFilters(getSessionReplayPageFilters(false), getSessionReplayPageFilters(true));
