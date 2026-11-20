import { FilterParameter } from "@rybbit/shared";

const BASE_FILTERS: FilterParameter[] = [
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
  "referrer",
  "page_title",
  "querystring",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "dimensions",
  "user_id",
  "lat",
  "lon",
  "tag",
];

export const SESSION_PAGE_FILTERS: FilterParameter[] = [...BASE_FILTERS, "pathname", "entry_page", "exit_page", "event_name"];

// Single-user detail page: the page is already scoped to one user, so the
// user_id filter is excluded.
export const USER_DETAIL_PAGE_FILTERS: FilterParameter[] = SESSION_PAGE_FILTERS.filter(f => f !== "user_id");

export const EVENT_FILTERS: FilterParameter[] = [
  ...BASE_FILTERS,
  "pathname",
  "page_title",
  "event_name",
  "entry_page",
  "exit_page",
];

export const GOALS_PAGE_FILTERS: FilterParameter[] = [...BASE_FILTERS];

export const FUNNEL_PAGE_FILTERS: FilterParameter[] = [...BASE_FILTERS];

export const USER_PAGE_FILTERS: FilterParameter[] = [
  ...BASE_FILTERS,
  "pathname",
  "entry_page",
  "exit_page",
];

export const JOURNEY_PAGE_FILTERS: FilterParameter[] = [
  "hostname",
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "entry_page",
  "exit_page",
  "dimensions",
  "browser_version",
  "operating_system_version",
  "user_id",
  "lat",
  "lon",
];

export const SESSION_REPLAY_PAGE_FILTERS: FilterParameter[] = [
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
  "referrer",
  "channel",
  "user_id",
];

// Mobile sites have no URL, referrer or campaign to speak of, and they carry two
// dimensions a website never has. Pages pick a list above and narrow it here.
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
  "entry_page",
  "exit_page",
];

const APP_ONLY_FILTERS: FilterParameter[] = ["device_model", "app_version"];

export function filtersForSite(filters: FilterParameter[], isApp: boolean): FilterParameter[] {
  if (!isApp) return filters;
  return [...APP_ONLY_FILTERS, ...filters.filter(filter => !WEB_ONLY_FILTERS.includes(filter))];
}
