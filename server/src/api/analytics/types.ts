// Import and re-export shared types
import type { Filter, FilterType, FilterParameter, TimeBucket, WebVitalMetric, PercentileLevel } from "@rybbit/shared";

// Re-export for other modules
export { Filter, FilterType, FilterParameter, TimeBucket, WebVitalMetric, PercentileLevel };

/** Loads that reported each metric, and how many of those were good and poor. */
export type WebVitalRatingCounts = {
  [K in WebVitalMetric as `${K}_${"count" | "good" | "poor"}`]: number;
};

export type PerformanceOverviewMetrics = {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
} & WebVitalRatingCounts & {
    total_performance_events: number;
  };

export type PerformanceTimeSeriesPoint = {
  time: string;
  event_count: number;
} & {
  [K in WebVitalMetric as `${K}_${PercentileLevel}`]: number | null;
};
