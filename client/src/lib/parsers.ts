import { Filter, FilterParameter, FilterType, TimeBucket } from "@rybbit/shared";
import { createParser, parseAsBoolean, parseAsInteger, parseAsJson, parseAsString, parseAsStringEnum } from "nuqs";
import { DASHBOARD_DEFAULT_TIME_RANGES } from "./defaultTimeRange";
import { StatType } from "./store";
import { Time } from "@/components/DateSelector/types";

// Basic parsers
export const parseAsOptionalString = parseAsString;
export const parseAsOptionalInteger = parseAsInteger;
export const parseAsOptionalBoolean = parseAsBoolean;

// TimeBucket parser with validation
const timeBucketValues: TimeBucket[] = [
  "minute",
  "five_minutes",
  "ten_minutes",
  "fifteen_minutes",
  "hour",
  "day",
  "week",
  "month",
  "year",
];

export const parseAsTimeBucket = parseAsStringEnum<TimeBucket>(timeBucketValues);

// StatType parser
const statTypeValues: StatType[] = [
  "pageviews",
  "sessions",
  "users",
  "pages_per_session",
  "bounce_rate",
  "session_duration",
];

export const parseAsStatType = parseAsStringEnum<StatType>(statTypeValues);

// Time mode parser
const timeModeValues: string[] = ["day", "range", "week", "month", "year", "all-time", "past-minutes"];

export const parseAsTimeMode = parseAsStringEnum(timeModeValues);

// Well-known preset parser — the preset list lives in defaultTimeRange.ts.
export const parseAsWellKnown = parseAsStringEnum<string>([...DASHBOARD_DEFAULT_TIME_RANGES]);

// ISO date string parser (for dates like "2024-01-01")
export const parseAsIsoDate = parseAsString;

// JSON parsers for complex types
const filterTypeValues: FilterType[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "regex",
  "not_regex",
  "is_null",
  "is_not_null",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
];

const filterParameterValues: FilterParameter[] = [
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
  "hostname",
  "pathname",
  "page_title",
  "querystring",
  "event_name",
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
  "timezone",
  "tag",
];

const filterTypeSet = new Set(filterTypeValues);
const filterParameterSet = new Set(filterParameterValues);

function isFilter(value: unknown): value is Filter {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Filter>;
  return (
    typeof candidate.parameter === "string" &&
    filterParameterSet.has(candidate.parameter as FilterParameter) &&
    typeof candidate.type === "string" &&
    filterTypeSet.has(candidate.type as FilterType) &&
    Array.isArray(candidate.value) &&
    candidate.value.every(item => typeof item === "string" || typeof item === "number")
  );
}

export const parseAsFilters = parseAsJson<Filter[]>(value => (Array.isArray(value) ? value.filter(isFilter) : []));
export const parseAsStringArray = parseAsJson<string[]>(value => value as string[]);

// GSC status parser (for OAuth callback)
export const parseAsGscStatus = parseAsString;

// Invitation parameters
export const invitationParsers = {
  organization: parseAsString,
  inviterEmail: parseAsString,
  invitationId: parseAsString,
};

// AppSumo callback parameters
export const appSumoCallbackParsers = {
  code: parseAsString,
  step: parseAsInteger,
};

// URL parameters for analytics/dashboard pages
export const analyticsParsers = {
  // Time parameters
  timeMode: parseAsTimeMode,
  wellKnown: parseAsWellKnown,
  day: parseAsIsoDate,
  startDate: parseAsIsoDate,
  endDate: parseAsIsoDate,
  startTime: parseAsOptionalString,
  endTime: parseAsOptionalString,
  startDateTime: parseAsOptionalString,
  endDateTime: parseAsOptionalString,
  week: parseAsIsoDate,
  month: parseAsIsoDate,
  year: parseAsIsoDate,
  past_minutes_start: parseAsInteger,
  past_minutes_end: parseAsInteger,

  // Display parameters
  bucket: parseAsTimeBucket,
  stat: parseAsStatType,
  filters: parseAsFilters,

  // Feature flags
  embed: parseAsBoolean,
  hideSidebar: parseAsBoolean,
};
