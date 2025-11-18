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
];

export const SESSION_PAGE_FILTERS: FilterParameter[] = [...BASE_FILTERS, "entry_page", "exit_page", "event_name"];

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
  "user_id",
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
  // "channel",
  // "utm_source",
  // "utm_medium",
  // "utm_campaign",
  // "utm_term",
  // "utm_content",
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
