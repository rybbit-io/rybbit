import { z } from "zod";

// Kept in sync with FilterType in @rybbit/shared
export const FILTER_TYPES = [
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
] as const;

// The commonly useful subset of FilterParameter in @rybbit/shared (excludes
// template params like feature_flag:* that need site-specific knowledge)
export const FILTER_PARAMETERS = [
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
  "browser_version",
  "operating_system_version",
  "user_id",
  "timezone",
  "tag",
] as const;

export const TIME_BUCKETS = [
  "minute",
  "five_minutes",
  "ten_minutes",
  "fifteen_minutes",
  "hour",
  "day",
  "week",
  "month",
  "year",
] as const;

export const siteIdInput = z
  .number()
  .int()
  .positive()
  .describe("Numeric site ID. Use list_sites first to find it.");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const timeInputs = {
  start_date: z
    .string()
    .regex(dateRegex, "Use YYYY-MM-DD")
    .optional()
    .describe(
      "Start date (YYYY-MM-DD, inclusive, interpreted in time_zone). Provide together with end_date. Omit all time inputs to query all time."
    ),
  end_date: z
    .string()
    .regex(dateRegex, "Use YYYY-MM-DD")
    .optional()
    .describe("End date (YYYY-MM-DD, inclusive, interpreted in time_zone)."),
  time_zone: z
    .string()
    .optional()
    .describe("IANA time zone used to interpret dates and buckets, e.g. America/New_York. Defaults to UTC."),
  past_minutes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Query the trailing N minutes instead of a date range, e.g. 1440 for the last 24 hours."),
};

export type TimeArgs = {
  start_date?: string;
  end_date?: string;
  time_zone?: string;
  past_minutes?: number;
};

export const filtersInput = z
  .array(
    z.object({
      parameter: z.enum(FILTER_PARAMETERS).describe("The dimension to filter on"),
      type: z.enum(FILTER_TYPES),
      value: z
        .array(z.union([z.string(), z.number()]))
        .min(1)
        .describe("Values to match; multiple values in one filter are ORed"),
    })
  )
  .optional()
  .describe(
    'Optional filters, ANDed together. Example: [{"parameter":"device_type","type":"equals","value":["Mobile"]}]'
  );

export type FilterArgs = z.infer<typeof filtersInput>;

/**
 * Maps the tool-level time arguments onto the REST API's query params.
 * Omitting every time input is valid and means "all time".
 */
export function toTimeQuery(args: TimeArgs): Record<string, string | number | undefined> {
  if (args.past_minutes !== undefined) {
    // The API expects a [start, end) window in minutes-ago, oldest first.
    return { past_minutes_start: args.past_minutes, past_minutes_end: 0 };
  }
  if (!args.start_date && !args.end_date) {
    return {};
  }
  return {
    start_date: args.start_date,
    end_date: args.end_date,
    time_zone: args.time_zone ?? "UTC",
  };
}

export function toFiltersQuery(filters: FilterArgs): Record<string, string | undefined> {
  return { filters: filters && filters.length > 0 ? JSON.stringify(filters) : undefined };
}
