import { z } from "zod";

// Filter schemas
export const filterParameterSchema = z.enum([
  "browser",
  "operating_system",
  "language",
  "country",
  "region",
  "city",
  "device_type",
  "referrer",
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
  // derivative parameters
  "entry_page",
  "exit_page",
  "dimensions",
  "browser_version",
  "operating_system_version",
]);

export const filterTypeSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
]);

export const filterSchema = z.object({
  parameter: filterParameterSchema,
  type: filterTypeSchema,
  value: z.array(z.string()),
});

// GetOverview schemas
export const getOverviewInputSchema = z.object({
  site: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timeZone: z.string(),
  filters: z.string().default("[]"), // JSON string of filters array
  pastMinutesStart: z.number().optional(),
  pastMinutesEnd: z.number().optional(),
});

export const getOverviewOutputSchema = z.object({
  sessions: z.number(),
  pageviews: z.number(),
  users: z.number(),
  pages_per_session: z.number(),
  bounce_rate: z.number(),
  session_duration: z.number(),
});

// Export TypeScript types
export type FilterParameter = z.infer<typeof filterParameterSchema>;
export type FilterType = z.infer<typeof filterTypeSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type GetOverviewInput = z.infer<typeof getOverviewInputSchema>;
export type GetOverviewOutput = z.infer<typeof getOverviewOutputSchema>;
