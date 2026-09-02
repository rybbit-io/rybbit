import { FilterParameter } from "@rybbit/shared";
import { z } from "zod";
import { dateRegex, dateTimeRegex, isValidTimeZone, parseDateTimeMs } from "./timeWindow.js";

// =============================================================================
// FILTER RELATED SCHEMAS
// =============================================================================

/**
 * Schema for filter type values
 */
const filterTypeSchema = z.enum([
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
]);

/**
 * Schema for filter parameter values
 */
const baseFilterParamSchema = z.enum([
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
]);

export const filterParamSchema: z.ZodType<FilterParameter> = z.union([
  baseFilterParamSchema,
  z.string().regex(/^feature_flag:[A-Za-z][A-Za-z0-9_.:-]{0,99}$/),
]) as z.ZodType<FilterParameter>;

/**
 * Schema for filter objects
 */
export const filterSchema = z.object({
  parameter: filterParamSchema,
  type: filterTypeSchema,
  value: z.array(z.string().or(z.number())),
});

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

// =============================================================================
// HTTP-LEVEL TIME PARAM VALIDATION
// =============================================================================

const optionalNonNegativeMinutes = z
  .union([z.string(), z.number()])
  .optional()
  .refine(val => val === undefined || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "past_minutes values must be non-negative numbers",
  });

/**
 * Validates the shared time query parameters of an HTTP request. Absent params
 * are fine (all-time mode is legitimate); params that are present but
 * malformed, unpaired, or inconsistent are an error — historically these were
 * silently dropped, so the query ran over all time and returned wrong data
 * with a 200.
 */
const httpTimeParamsSchema = z
  .object({
    start_date: z
      .string()
      .regex(dateRegex, { message: "Invalid start_date format. Use YYYY-MM-DD" })
      .refine(date => !isNaN(Date.parse(date)), { message: "Invalid start_date value" })
      .optional(),
    end_date: z
      .string()
      .regex(dateRegex, { message: "Invalid end_date format. Use YYYY-MM-DD" })
      .refine(date => !isNaN(Date.parse(date)), { message: "Invalid end_date value" })
      .optional(),
    time_zone: z.string().refine(isValidTimeZone, { message: "Invalid time_zone" }).optional(),
    start_datetime: z
      .string()
      .regex(dateTimeRegex, { message: "Invalid start_datetime format. Use YYYY-MM-DD HH:mm:ss" })
      .refine(date => !isNaN(parseDateTimeMs(date)), { message: "Invalid start_datetime value" })
      .optional(),
    end_datetime: z
      .string()
      .regex(dateTimeRegex, { message: "Invalid end_datetime format. Use YYYY-MM-DD HH:mm:ss" })
      .refine(date => !isNaN(parseDateTimeMs(date)), { message: "Invalid end_datetime value" })
      .optional(),
    past_minutes_start: optionalNonNegativeMinutes,
    past_minutes_end: optionalNonNegativeMinutes,
  })
  .refine(data => !!data.start_date === !!data.end_date, {
    message: "start_date and end_date must be provided together",
  })
  .refine(data => !!data.start_datetime === !!data.end_datetime, {
    message: "start_datetime and end_datetime must be provided together",
  })
  .refine(data => (data.past_minutes_start === undefined) === (data.past_minutes_end === undefined), {
    message: "past_minutes_start and past_minutes_end must be provided together",
  })
  .refine(
    data =>
      !data.start_datetime ||
      !data.end_datetime ||
      parseDateTimeMs(data.start_datetime) < parseDateTimeMs(data.end_datetime),
    { message: "start_datetime must be before end_datetime" }
  )
  .refine(
    data =>
      data.past_minutes_start === undefined ||
      data.past_minutes_end === undefined ||
      Number(data.past_minutes_start) > Number(data.past_minutes_end),
    { message: "past_minutes_start must be greater than past_minutes_end (start = older, end = newer)" }
  );

/**
 * Returns an error message if the request's time query params are present but
 * invalid, or null if they are valid or absent. Empty-string values count as
 * absent: the dashboard sends `start_date=&end_date=` in all-time mode, and
 * `?param=` in a query string has always meant "no value" to these endpoints.
 */
export function validateHttpTimeParams(query: unknown): string | null {
  const withoutEmpty =
    typeof query === "object" && query !== null
      ? Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ""))
      : {};
  const result = httpTimeParamsSchema.safeParse(withoutEmpty);
  if (result.success) {
    return null;
  }
  return result.error.issues.map(issue => issue.message).join("; ");
}

/**
 * Validates and sanitizes filters for getFilterStatement()
 * @param filtersStr JSON string of filters
 * @returns Validated array of filter objects
 */
export function validateFilters(filtersStr: string) {
  // First validate it's proper JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(filtersStr);
  } catch (e) {
    throw new Error("Invalid JSON format");
  }

  // Then validate the parsed structure
  return z.array(filterSchema).parse(parsed);
}
