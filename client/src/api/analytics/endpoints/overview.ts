import {
  CommonApiParams,
  BucketedParams,
  MetricParams,
  toQueryParams,
  toBucketedQueryParams,
  toMetricQueryParams,
} from "./types";

// Overview response type
export type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

// Overview bucketed response type
export type GetOverviewBucketedResponse = {
  time: string;
  pageviews: number;
  sessions: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
  users: number;
}[];

// Metric response type
export type MetricResponse = {
  value: string;
  title?: string;
  hostname?: string;
  count: number;
  percentage: number;
  pageviews?: number;
  pageviews_percentage?: number;
  time_on_page_seconds?: number;
  bounce_rate?: number;
};

// Live user count response type
export interface LiveUserCountResponse {
  count: number;
}
