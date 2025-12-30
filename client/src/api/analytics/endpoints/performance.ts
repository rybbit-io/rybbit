import { TimeBucket } from "@rybbit/shared";
import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, SortParams, toQueryParams } from "./types";

// Performance Overview Response
export type GetPerformanceOverviewResponse = {
  current: {
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    ttfb: number;
  };
  previous: {
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    ttfb: number;
  };
};

// Performance Time Series Response
export type GetPerformanceTimeSeriesResponse = {
  time: string;
  event_count: number;
  lcp_p50: number | null;
  lcp_p75: number | null;
  lcp_p90: number | null;
  lcp_p99: number | null;
  cls_p50: number | null;
  cls_p75: number | null;
  cls_p90: number | null;
  cls_p99: number | null;
  inp_p50: number | null;
  inp_p75: number | null;
  inp_p90: number | null;
  inp_p99: number | null;
  fcp_p50: number | null;
  fcp_p75: number | null;
  fcp_p90: number | null;
  fcp_p99: number | null;
  ttfb_p50: number | null;
  ttfb_p75: number | null;
  ttfb_p90: number | null;
  ttfb_p99: number | null;
}[];

// Performance By Dimension Item
export type PerformanceByDimensionItem = {
  [key: string]: any;
  event_count: number;
  lcp_avg: number | null;
  lcp_p50: number | null;
  lcp_p75: number | null;
  lcp_p90: number | null;
  lcp_p99: number | null;
  cls_avg: number | null;
  cls_p50: number | null;
  cls_p75: number | null;
  cls_p90: number | null;
  cls_p99: number | null;
  inp_avg: number | null;
  inp_p50: number | null;
  inp_p75: number | null;
  inp_p90: number | null;
  inp_p99: number | null;
  fcp_avg: number | null;
  fcp_p50: number | null;
  fcp_p75: number | null;
  fcp_p90: number | null;
  fcp_p99: number | null;
  ttfb_avg: number | null;
  ttfb_p50: number | null;
  ttfb_p75: number | null;
  ttfb_p90: number | null;
  ttfb_p99: number | null;
};

export interface PerformanceOverviewParams extends CommonApiParams {
  percentile?: number | string;
}

export interface PerformanceTimeSeriesParams extends CommonApiParams {
  bucket: TimeBucket;
}

export interface PerformanceByDimensionParams
  extends CommonApiParams,
    PaginationParams,
    SortParams {
  dimension: string;
  percentile?: number | string;
}

export interface PaginatedPerformanceResponse {
  data: PerformanceByDimensionItem[];
  totalCount: number;
}

/**
 * Fetch performance overview (Core Web Vitals)
 * GET /api/performance/overview/:site
 */
export async function fetchPerformanceOverview(
  site: string | number,
  params: PerformanceOverviewParams
): Promise<GetPerformanceOverviewResponse> {
  const queryParams = {
    ...toQueryParams(params),
    percentile: params.percentile,
  };

  const response = await authedFetch<{ data: GetPerformanceOverviewResponse }>(
    `/performance/overview/${site}`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch performance time series data
 * GET /api/performance/time-series/:site
 */
export async function fetchPerformanceTimeSeries(
  site: string | number,
  params: PerformanceTimeSeriesParams
): Promise<GetPerformanceTimeSeriesResponse> {
  const queryParams = {
    ...toQueryParams(params),
    bucket: params.bucket,
  };

  const response = await authedFetch<{ data: GetPerformanceTimeSeriesResponse }>(
    `/performance/time-series/${site}`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch performance broken down by dimension
 * GET /api/performance/by-dimension/:site
 */
export async function fetchPerformanceByDimension(
  site: string | number,
  params: PerformanceByDimensionParams
): Promise<PaginatedPerformanceResponse> {
  const queryParams = {
    ...toQueryParams(params),
    dimension: params.dimension,
    limit: params.limit,
    page: params.page,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    percentile: params.percentile,
  };

  const response = await authedFetch<{ data: PaginatedPerformanceResponse }>(
    `/performance/by-dimension/${site}`,
    queryParams
  );
  return response.data;
}
