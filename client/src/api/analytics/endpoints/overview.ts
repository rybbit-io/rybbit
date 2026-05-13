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

/**
 * Fetch overview metrics for a site
 * GET /api/overview/:site
 */
export async function fetchOverview(
  site: string | number,
  params: CommonApiParams
): Promise<GetOverviewResponse> {
  const response = await authedFetch<{ data: GetOverviewResponse }>(
    `/sites/${site}/overview`,
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
    `/sites/${site}/overview-bucketed`,
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
  }>(`/sites/${site}/metric`, toMetricQueryParams(params));
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
    `/sites/${site}/live-user-count`,
    { minutes }
  );
  return response;
}

/**
 * Fetch lite overview (MV-backed, no filters).
 * GET /api/sites/:site/overview-lite
 */
export async function fetchOverviewLite(
  site: string | number,
  params: CommonApiParams
): Promise<GetOverviewResponse> {
  const response = await authedFetch<{ data: GetOverviewResponse }>(
    `/sites/${site}/overview-lite`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch lite bucketed overview (MV-backed).
 * GET /api/sites/:site/overview-bucketed-lite
 */
export async function fetchOverviewBucketedLite(
  site: string | number,
  params: BucketedParams
): Promise<GetOverviewBucketedResponse> {
  const response = await authedFetch<{ data: GetOverviewBucketedResponse }>(
    `/sites/${site}/overview-bucketed-lite`,
    toBucketedQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch lite metric (MV-backed). Supports pathname, country, and device type.
 * GET /api/sites/:site/metric-lite
 */
export async function fetchMetricLite(
  site: string | number,
  params: MetricParams
): Promise<{ data: MetricResponse[]; totalCount: number }> {
  const response = await authedFetch<{
    data: { data: MetricResponse[]; totalCount: number };
  }>(`/sites/${site}/metric-lite`, toMetricQueryParams(params));
  return response.data;
}
