import { authedFetch } from "../../utils";
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

/**
 * Fetch overview metrics for a site
 * GET /api/overview/:site
 */
export async function fetchOverview(
  site: string | number,
  params: CommonApiParams
): Promise<GetOverviewResponse> {
  const response = await authedFetch<{ data: GetOverviewResponse }>(
    `/overview/${site}`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch time-series overview data
 * GET /api/overview-bucketed/:site
 */
export async function fetchOverviewBucketed(
  site: string | number,
  params: BucketedParams
): Promise<GetOverviewBucketedResponse> {
  const response = await authedFetch<{ data: GetOverviewBucketedResponse }>(
    `/overview-bucketed/${site}`,
    toBucketedQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch dimensional metric data
 * GET /api/metric/:site
 */
export async function fetchMetric(
  site: string | number,
  params: MetricParams
): Promise<{ data: MetricResponse[]; totalCount: number }> {
  const response = await authedFetch<{
    data: { data: MetricResponse[]; totalCount: number };
  }>(`/metric/${site}`, toMetricQueryParams(params));
  return response.data;
}

/**
 * Fetch live user count
 * GET /api/live-user-count/:site
 */
export async function fetchLiveUserCount(
  site: string | number,
  minutes: number = 5
): Promise<LiveUserCountResponse> {
  const response = await authedFetch<LiveUserCountResponse>(
    `/live-user-count/${site}`,
    { minutes }
  );
  return response;
}
