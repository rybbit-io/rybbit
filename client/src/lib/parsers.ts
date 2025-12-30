import { Filter, TimeBucket } from "@rybbit/shared";
import { createParser, parseAsBoolean, parseAsInteger, parseAsJson, parseAsString, parseAsStringEnum } from "nuqs";
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
const timeModeValues: string[] = [
  "day",
  "range",
  "week",
  "month",
  "year",
  "all-time",
  "past-minutes",
];

export const parseAsTimeMode = parseAsStringEnum(timeModeValues);

// Well-known preset parser
const wellKnownValues: string[] = [
  "today",
  "yesterday",
  "last-3-days",
  "last-7-days",
  "last-14-days",
  "last-30-days",
  "last-60-days",
  "this-week",
  "last-week",
  "this-month",
  "last-month",
  "this-year",
  "last-30-minutes",
  "last-1-hour",
  "last-6-hours",
  "last-24-hours",
  "all-time",
];

export const parseAsWellKnown = parseAsStringEnum(wellKnownValues);

// ISO date string parser (for dates like "2024-01-01")
export const parseAsIsoDate = parseAsString;

// JSON parsers for complex types
export const parseAsFilters = parseAsJson<Filter[]>((value) => value as Filter[]);
export const parseAsStringArray = parseAsJson<string[]>((value) => value as string[]);

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
};
