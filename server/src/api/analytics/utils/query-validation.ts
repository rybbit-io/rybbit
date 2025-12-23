import { FilterParams } from "@rybbit/shared";
import { z } from "zod";

// =============================================================================
// TIME RELATED SCHEMAS
// =============================================================================

/**
 * Date validation regex for YYYY-MM-DD format
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schema for simplified date parameters without table
 */
const fillDateParamsSchema = z.object({
  start_date: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine(date => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  end_date: z
    .string()
    .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
    .optional()
    .refine(date => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date value",
    }),
  time_zone: z
    .string()
    .min(1, { message: "Time zone cannot be empty" })
    .refine(
      tz => {
        try {
          // Test if time zone is valid by attempting to format a date with it
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: "Invalid time zone" }
    ),
});

/**
 * Schema for parameters to getTimeStatement() function
 * Either date or pastMinutesRange must be provided
 */
const timeStatementParamsSchema = z
  .object({
    date: fillDateParamsSchema.optional(),
    pastMinutesRange: z
      .object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
      })
      .optional()
      .refine(data => !data || data.start > data.end, {
        message: "start must be greater than end (start = older, end = newer)",
      }),
  })
  .refine(data => data.date !== undefined || data.pastMinutesRange !== undefined, {
    message: "Either date or pastMinutesRange must be provided",
  })
  // Set default empty objects if schema validation fails
  .catch({
    date: undefined,
    pastMinutesRange: undefined,
  });

/**
 * Schema for FilterParams used in getTimeStatementFill() function
 */
const filterParamsTimeStatementFillSchema = z
  .object({
    start_date: z
      .string()
      .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
      .optional()
      .refine(date => !date || !isNaN(Date.parse(date)), {
        message: "Invalid date value",
      }),
    end_date: z
      .string()
      .regex(dateRegex, { message: "Invalid date format. Use YYYY-MM-DD" })
      .optional()
      .refine(date => !date || !isNaN(Date.parse(date)), {
        message: "Invalid date value",
      }),
    time_zone: z
      .string()
      .min(1, { message: "Time zone cannot be empty" })
      .optional()
      .refine(
        tz => {
          if (!tz) return true;
          try {
            // Test if time zone is valid by attempting to format a date with it
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch (e) {
            return false;
          }
        },
        { message: "Invalid time zone" }
      ),
    past_minutes_start: z
      .union([z.string(), z.number()])
      .optional()
      .transform(val => {
        if (val === undefined) return undefined;
        const num = typeof val === "string" ? Number(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine(val => val === undefined || val >= 0, {
        message: "past_minutes_start must be non-negative",
      }),
    past_minutes_end: z
      .union([z.string(), z.number()])
      .optional()
      .transform(val => {
        if (val === undefined) return undefined;
        const num = typeof val === "string" ? Number(val) : val;
        return isNaN(num) ? undefined : num;
      })
      .refine(val => val === undefined || val >= 0, {
        message: "past_minutes_end must be non-negative",
      }),
    filters: z.string().optional(),
  })
  .refine(
    data => {
      const hasDateParams = data.start_date && data.end_date && data.time_zone;
      const hasPastMinutesParams = data.past_minutes_start !== undefined && data.past_minutes_end !== undefined;
      return hasDateParams || hasPastMinutesParams;
    },
    {
      message: "Either (start_date, end_date, time_zone) or (past_minutes_start, past_minutes_end) must be provided",
    }
  )
  .refine(
    data => {
      if (data.past_minutes_start !== undefined && data.past_minutes_end !== undefined) {
        return data.past_minutes_start > data.past_minutes_end;
      }
      return true;
    },
    {
      message: "past_minutes_start must be greater than past_minutes_end (start = older, end = newer)",
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
  "regex",
  "not_regex",
  "greater_than",
  "less_than",
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
  "vpn",
  "crawler",
  "datacenter",
  "company",
  "company_type",
  "company_domain",
  "asn_org",
  "asn_type",
  "asn_domain",
]);

/**
 * Schema for filter objects
 */
const filterSchema = z.object({
  parameter: filterParamSchema,
  type: filterTypeSchema,
  value: z.array(z.string().or(z.number())),
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
 * Validates and sanitizes FilterParams for getTimeStatementFill()
 * @param params FilterParams object
 * @param bucket Raw bucket parameter
 * @returns Validated parameters and bucket
 */
export function validateTimeStatementFillParams(params: FilterParams, bucket: unknown) {
  const validatedBucket = timeBucketSchema.parse(bucket);
  const validatedParams = filterParamsTimeStatementFillSchema.parse(params);

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
