/**
 * Centralizes all date normalization logic
 * Replaces duplicate implementations across statsService, eventStatsService, userService
 */

export interface DateRange {
  fromDate?: string;
  toDate?: string;
}

/**
 * Normalizes date input to YYYY-MM-DD format
 * Throws error for invalid dates
 */
export function normalizeDateToYYYYMMDD(input?: string): string | undefined {
  if (!input) return undefined;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${input}`);
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Normalizes a date range object
 * Handles both from/to parameters
 */
export function normalizeDateRange(params: {
  from?: string;
  to?: string;
}): DateRange {
  const range: DateRange = {};

  if (params.from) {
    range.fromDate = normalizeDateToYYYYMMDD(params.from);
  }

  if (params.to) {
    range.toDate = normalizeDateToYYYYMMDD(params.to);
  }

  return range;
}

/**
 * Validates and normalizes ISO date string
 * Returns ISO format for timestamp fields
 */
export function normalizeISODate(input?: string): string | undefined {
  if (!input) return undefined;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${input}`);
  }

  return date.toISOString();
}
