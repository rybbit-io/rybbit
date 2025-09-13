// Import and re-export shared types
import type { Filter, FilterType, FilterParameter, TimeBucket, WebVitalMetric, PercentileLevel } from "@rybbit/shared";

// Re-export for other modules
export { Filter, FilterType, FilterParameter, TimeBucket, WebVitalMetric, PercentileLevel };

export type PerformanceOverviewMetrics = {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
} & {
  total_performance_events: number;
};

export type PerformanceTimeSeriesPoint = {
  time: string;
  event_count: number;
} & {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
};

export type PerformanceByPathItem = {
  pathname: string;
  event_count: number;
} & {
  [K in WebVitalMetric as `${K}_avg`]: number | null;
} & {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
};
