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

/** A tool argument the caller can fix, surfaced verbatim to the MCP client. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

/**
 * Maps the tool-level time arguments onto the REST API's query params.
 * Omitting every time input is valid and means "all time".
 */
export function toTimeQuery(args: TimeArgs): Record<string, string | number | undefined> {
  if (args.past_minutes !== undefined) {
    if (args.start_date || args.end_date) {
      // Silently preferring one over the other would answer a different
      // question than the model asked and present it as correct.
      throw new ToolInputError(
        "Provide either past_minutes or start_date/end_date, not both. Use past_minutes for a trailing window or start_date/end_date for a fixed range."
      );
    }
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

export const organizationIdInput = z.string().min(1).describe("Organization ID from list_sites");

export const memberRoleInput = z
  .enum(["admin", "member", "owner"])
  .describe("Role in the organization; only an owner key can grant 'owner'");

export const propertyFilterInput = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

// Kept in sync with AUTOCAPTURE_TARGET_TYPES in api/analytics/utils/eventConditions.ts
// and GOAL_TYPES in api/analytics/goals/goalSchema.ts. Inlined rather than imported:
// their import chains reach the Postgres client, which would break MCP test hermeticity.
export const AUTOCAPTURE_TYPES = ["outbound", "button_click", "form_submit", "copy"] as const;
export const GOAL_TYPES = ["path", "event", ...AUTOCAPTURE_TYPES] as const;

export const goalTypeInput = z
  .enum(GOAL_TYPES)
  .describe("'path' matches pageviews, 'event' matches custom events; autocapture types match captured interactions");

export const goalConfigInput = z.object({
  pathPattern: z
    .string()
    .optional()
    .describe("Required for path goals. Supports * (one path segment) and ** (across segments), e.g. /blog/**"),
  eventName: z.string().optional().describe("Required for event goals"),
  valuePattern: z.string().optional().describe("Autocapture goals: pattern the captured value must match; omit to match any"),
  eventPropertyKey: z.string().optional().describe("Event goals: only count events where this property..."),
  eventPropertyValue: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("...has this value (key and value must be provided together)"),
  propertyFilters: z.array(propertyFilterInput).optional(),
});

export const funnelStepInput = z.object({
  type: z
    .enum(["page", "event", ...AUTOCAPTURE_TYPES])
    .describe("'page' matches a pathname, 'event' matches a custom event name; autocapture types match captured interactions"),
  value: z.string().describe("The pathname (e.g. /pricing) or custom event name; may be empty for autocapture steps"),
  name: z.string().optional().describe("Optional label for the step"),
  hostname: z.string().optional(),
  propertyFilters: z.array(propertyFilterInput).optional(),
});

export const traitsInput = z.record(z.unknown()).describe("Key-value traits, max 2KB serialized");

// Site feature toggles shared by create_site and update_site_config; keys match
// the REST body (updateSiteConfigSchema / addSite) verbatim.
export const siteFeatureInputs = {
  public: z.boolean().optional().describe("Make the site dashboard publicly viewable"),
  saltUserIds: z.boolean().optional().describe("Salt user IDs daily for stronger anonymity"),
  blockBots: z.boolean().optional().describe("Drop bot traffic at ingestion"),
  sessionReplay: z.boolean().optional().describe("Record session replays"),
  webVitals: z.boolean().optional().describe("Collect Core Web Vitals"),
  trackErrors: z.boolean().optional().describe("Capture JavaScript errors"),
  trackOutbound: z.boolean().optional().describe("Track outbound link clicks"),
  trackUrlParams: z.boolean().optional().describe("Keep URL query parameters in analytics"),
  trackInitialPageView: z.boolean().optional(),
  trackSpaNavigation: z.boolean().optional(),
  trackIp: z.boolean().optional().describe("Store visitor IP addresses"),
  trackButtonClicks: z.boolean().optional(),
  trackCopy: z.boolean().optional(),
  trackFormInteractions: z.boolean().optional(),
};
