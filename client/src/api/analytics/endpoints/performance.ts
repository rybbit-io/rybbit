import type { PercentileLevel, TimeBucket, WebVitalMetric } from "@rybbit/shared";
import { CommonApiParams, PaginationParams, SortParams } from "./types";

type WebVitalPercentiles = {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
};

/** Loads that reported each metric, and how many of those were good and poor. */
export type WebVitalRatingCounts = {
  [K in WebVitalMetric as `${K}_${"count" | "good" | "poor"}`]: number;
};

// Performance Overview Response
export type GetPerformanceOverviewResponse = WebVitalPercentiles &
  WebVitalRatingCounts & {
    total_performance_events: number;
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
} & WebVitalRatingCounts;

export type PerformanceOverviewParams = CommonApiParams;

export interface PerformanceTimeSeriesParams extends CommonApiParams {
  bucket: TimeBucket;
}

export interface PerformanceByDimensionParams extends CommonApiParams, PaginationParams, SortParams {
  dimension: string;
}

export interface PaginatedPerformanceResponse {
  data: PerformanceByDimensionItem[];
  totalCount: number;
}
