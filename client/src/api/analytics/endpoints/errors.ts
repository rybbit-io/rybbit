import { TimeBucket } from "@rybbit/shared";
import { CommonApiParams, PaginationParams } from "./types";

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
