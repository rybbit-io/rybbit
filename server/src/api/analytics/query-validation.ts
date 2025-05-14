import { z } from "zod";
import { Filter, FilterParameter, FilterType } from "./types.js";

// =============================================================================
// TIME RELATED SCHEMAS
// =============================================================================

/**
 * Schema for table parameter in time queries
 */
const tableSchema = z.enum(["events", "sessions"]).optional();

/**
 * Date validation regex for YYYY-MM-DD format
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schema for date parameters with timezone
 */
const dateParamsSchema = z.object({
  startDate: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  endDate: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  timezone: z
    .string()
    .min(1, { message: "Timezone cannot be empty" })
    .refine(
      (tz) => {
        try {
          // Test if timezone is valid by attempting to format a date with it
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: "Invalid timezone" }
    ),
  table: tableSchema,
});

/**
 * Schema for simplified date parameters without table
 */
const fillDateParamsSchema = z.object({
  startDate: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  endDate: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  timezone: z
    .string()
    .min(1, { message: "Timezone cannot be empty" })
    .refine(
      (tz) => {
        try {
          // Test if timezone is valid by attempting to format a date with it
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: "Invalid timezone" }
    ),
});

/**
 * Schema for parameters to getTimeStatement() function
 * Either date, pastMinutes, or pastMinutesRange must be provided
 */
const timeStatementParamsSchema = z
  .object({
    date: fillDateParamsSchema.optional(),
    pastMinutes: z.number().nonnegative().optional(),
    pastMinutesRange: z
      .object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
      })
      .optional()
      .refine((data) => !data || data.start > data.end, {
        message: "start must be greater than end (start = older, end = newer)",
      }),
  })
  .refine(
    (data) =>
      data.date !== undefined ||
      data.pastMinutes !== undefined ||
      data.pastMinutesRange !== undefined,
    {
      message: "Either date, pastMinutes, or pastMinutesRange must be provided",
    }
  )
  // Set default empty objects if schema validation fails
  .catch({
    date: undefined,
    pastMinutes: undefined,
    pastMinutesRange: undefined,
  });

/**
 * Schema for parameters to getTimeStatementFill() function
 * Either date, pastMinutes, or pastMinutesRange must be provided
 */
const timeStatementFillParamsSchema = z
  .object({
    date: fillDateParamsSchema.optional(),
    pastMinutes: z.number().nonnegative().optional(),
    pastMinutesRange: z
      .object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
      })
      .optional()
      .refine((data) => !data || data.start > data.end, {
        message: "start must be greater than end (start = older, end = newer)",
      }),
  })
  .refine(
    (data) =>
      data.date !== undefined ||
      data.pastMinutes !== undefined ||
      data.pastMinutesRange !== undefined,
    {
      message: "Either date, pastMinutes, or pastMinutesRange must be provided",
    }
  );

// =============================================================================
// BUCKET RELATED SCHEMAS
// =============================================================================

/**
 * Schema for time bucket values
 */
const timeBucketSchema = z.enum([
  "minute",
  "five_minutes",
  "ten_minutes",
  "fifteen_minutes",
  "hour",
  "day",
  "week",
  "month",
  "year",
]);

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
]);

/**
 * Schema for filter parameter values
 */
export const filterParamSchema = z.enum([
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
  "entry_page",
  "exit_page",
  "dimensions",
]);

/**
 * Schema for filter objects
 */
const filterSchema = z.object({
  parameter: filterParamSchema,
  type: filterTypeSchema,
  value: z.array(z.string()),
});

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Validates and sanitizes parameters for getTimeStatement()
 * @param params Raw input parameters
 * @returns Validated parameters
 */
export function validateTimeStatementParams(params: unknown) {
  return timeStatementParamsSchema.parse(params);
}

/**
 * Validates and sanitizes parameters for getTimeStatementFill()
 * @param params Raw time parameters
 * @param bucket Raw bucket parameter
 * @returns Validated parameters and bucket
 */
export function validateTimeStatementFillParams(
  params: unknown,
  bucket: unknown
) {
  const validatedParams = timeStatementFillParamsSchema.parse(params);
  const validatedBucket = timeBucketSchema.parse(bucket);

  return {
    params: validatedParams,
    bucket: validatedBucket,
  };
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
