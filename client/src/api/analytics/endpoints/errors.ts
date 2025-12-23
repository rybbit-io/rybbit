import { TimeBucket } from "@rybbit/shared";
import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

// Error Name Item type
export type ErrorNameItem = {
  value: string; // Error message
  errorName: string; // Error type (TypeError, ReferenceError, etc.)
  count: number; // Total occurrences
  sessionCount: number; // Unique sessions affected
  percentage: number;
};

// Paginated response for error names
export type ErrorNamesPaginatedResponse = {
  data: ErrorNameItem[];
  totalCount: number;
};

// Non-paginated response (standard format)
export type ErrorNamesStandardResponse = ErrorNameItem[];

// Error Event type
export type ErrorEvent = {
  timestamp: string;
  session_id: string;
  user_id: string | null;
  pathname: string | null;
  hostname: string | null;
  page_title: string | null;
  referrer: string | null;
  browser: string | null;
  browser_version: string | null;
  operating_system: string | null;
  operating_system_version: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  // Parsed error properties
  message: string;
  stack: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
};

// Paginated response for error events
export type ErrorEventsPaginatedResponse = {
  data: ErrorEvent[];
  totalCount: number;
};

// Non-paginated response (standard format)
export type ErrorEventsStandardResponse = ErrorEvent[];

// Error bucketed response (time series)
export type GetErrorBucketedResponse = {
  time: string;
  error_count: number;
}[];

export interface ErrorNamesParams extends CommonApiParams, PaginationParams {}

export interface ErrorEventsParams extends CommonApiParams, PaginationParams {
  errorMessage: string;
}

export interface ErrorBucketedParams extends CommonApiParams {
  errorMessage: string;
  bucket: TimeBucket;
}

/**
 * Fetch error names with counts
 * GET /api/error-names/:site
 */
export async function fetchErrorNames(
  site: string | number,
  params: ErrorNamesParams
): Promise<ErrorNamesPaginatedResponse> {
  const queryParams = {
    ...toQueryParams(params),
    limit: params.limit,
    page: params.page,
  };

  const response = await authedFetch<{ data: ErrorNamesPaginatedResponse }>(
    `/error-names/${site}`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch individual error events
 * GET /api/error-events/:site
 */
export async function fetchErrorEvents(
  site: string | number,
  params: ErrorEventsParams
): Promise<ErrorEventsPaginatedResponse> {
  const queryParams = {
    ...toQueryParams(params),
    errorMessage: params.errorMessage,
    limit: params.limit,
    page: params.page,
  };

  const response = await authedFetch<{ data: ErrorEventsPaginatedResponse }>(
    `/error-events/${site}`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch error counts over time
 * GET /api/error-bucketed/:site
 */
export async function fetchErrorBucketed(
  site: string | number,
  params: ErrorBucketedParams
): Promise<GetErrorBucketedResponse> {
  const queryParams = {
    ...toQueryParams(params),
    errorMessage: params.errorMessage,
    bucket: params.bucket,
  };

  const response = await authedFetch<{ data: GetErrorBucketedResponse }>(
    `/error-bucketed/${site}`,
    queryParams
  );
  return response.data;
}
