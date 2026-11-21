import { Filter, FilterParameter, TimeBucket } from "@rybbit/shared";

/**
 * Common parameters shared across most analytics API endpoints
 * Supports date range, exact datetime range, or past-minutes mode
 */
export interface CommonApiParams {
  startDate: string; // YYYY-MM-DD format (empty string for past-minutes mode)
  endDate: string; // YYYY-MM-DD format (empty string for past-minutes mode)
  timeZone: string; // IANA timezone string
  filters?: Filter[];
  // Optional exact UTC datetime range params.
  startDateTime?: string;
  endDateTime?: string;
  // Optional past-minutes mode params (when startDate/endDate are empty)
  pastMinutesStart?: number;
  pastMinutesEnd?: number;
}

/**
 * Parameters for bucketed/time-series endpoints
 */
export interface BucketedParams extends CommonApiParams {
  bucket: TimeBucket;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Parameters for the metric endpoint
 */
export interface MetricParams extends CommonApiParams, PaginationParams {
  parameter: FilterParameter;
}

/**
 * Sort parameters for paginated endpoints
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Convert CommonApiParams to query params format expected by the API
 * Handles date range, exact datetime range, and past-minutes mode
 */
export function toQueryParams(params: CommonApiParams): Record<string, any> {
  if (params.startDateTime !== undefined && params.endDateTime !== undefined) {
    return {
      time_zone: params.timeZone,
      start_datetime: params.startDateTime,
      end_datetime: params.endDateTime,
      filters: params.filters?.length ? params.filters : undefined,
    };
  }

  // Use past-minutes mode if pastMinutesStart is provided
  if (params.pastMinutesStart !== undefined) {
    return {
      time_zone: params.timeZone,
      past_minutes_start: params.pastMinutesStart,
      past_minutes_end: params.pastMinutesEnd ?? 0,
      filters: params.filters?.length ? params.filters : undefined,
    };
  }

  // Default to date range mode
  return {
    start_date: params.startDate,
    end_date: params.endDate,
    time_zone: params.timeZone,
    filters: params.filters?.length ? params.filters : undefined,
  };
}

/**
 * Convert BucketedParams to query params format
 */
export function toBucketedQueryParams(
  params: BucketedParams
): Record<string, any> {
  return {
    ...toQueryParams(params),
    bucket: params.bucket,
  };
}

/**
 * Convert MetricParams to query params format
 */
export function toMetricQueryParams(params: MetricParams): Record<string, any> {
  return {
    ...toQueryParams(params),
    parameter: params.parameter,
    limit: params.limit,
    page: params.page,
  };
}
