import round from "lodash/round";
import { PerformanceMetric } from "../performanceStore";

// Performance metric thresholds for color coding based on Web Vitals standards
// These thresholds are consistent regardless of percentile level
const PERFORMANCE_THRESHOLDS = {
  lcp: { good: 2500, needs_improvement: 4000, poor: Infinity }, // Web Vitals standard
  cls: { good: 0.1, needs_improvement: 0.25, poor: Infinity }, // Web Vitals standard
  inp: { good: 200, needs_improvement: 500, poor: Infinity }, // Web Vitals standard
  fcp: { good: 1800, needs_improvement: 3000, poor: Infinity }, // Web Vitals standard
  ttfb: { good: 800, needs_improvement: 1800, poor: Infinity }, // Web Vitals standard
} as const;

/**
 * Get the appropriate color class for a performance metric value based on Web Vitals thresholds
 */
export const getMetricColor = (metric: PerformanceMetric, value: number): string => {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];

  if (!thresholds) {
    return "text-white";
  }

  if (value <= thresholds.good) {
    return "text-green-400";
  }

  if (value <= thresholds.needs_improvement) {
    return "text-yellow-400";
  }

  // Poor performance (above needs_improvement threshold)
  return "text-red-400";
};

/**
 * Format a performance metric value for display
 */
export const formatMetricValue = (metric: PerformanceMetric, value: number): string => {
  if (metric === "cls") {
    return round(value, 3).toString();
  }
  if (value >= 1000) {
    return round(value / 1000, 2).toString();
  }
  return round(value, 0).toString();
};

/**
 * Get the appropriate unit for a performance metric value
 */
export const getMetricUnit = (metric: PerformanceMetric, value: number): string => {
  if (metric === "cls") return "";
  if (value >= 1000) return "s";
  return "ms";
};

/**
 * Performance metric labels for display
 */
export const METRIC_LABELS: Record<PerformanceMetric, string> = {
  lcp: "Largest Contentful Paint",
  cls: "Cumulative Layout Shift",
  inp: "Interaction to Next Paint",
  fcp: "First Contentful Paint",
  ttfb: "Time to First Byte",
};

/**
 * Short metric labels for compact display
 */
export const METRIC_LABELS_SHORT: Record<PerformanceMetric, string> = {
  lcp: "LCP",
  cls: "CLS",
  inp: "INP",
  fcp: "FCP",
  ttfb: "TTFB",
};

/**
 * Get the performance thresholds for a specific metric
 */
export const getPerformanceThresholds = (metric: PerformanceMetric) => {
  return PERFORMANCE_THRESHOLDS[metric] || null;
};

/** The order every surface lists the metrics in: the three Core Web Vitals, then the supporting two. */
export const PERFORMANCE_METRICS: PerformanceMetric[] = ["lcp", "inp", "cls", "fcp", "ttfb"];

export type MetricRating = "good" | "needs_improvement" | "poor";

export const METRIC_RATINGS: MetricRating[] = ["good", "needs_improvement", "poor"];

/** Where a value stands against the Web Vitals limits: up to `good` is good, over `needs_improvement` is poor. */
export const getMetricRating = (metric: PerformanceMetric, value: number): MetricRating => {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];
  if (value <= thresholds.good) return "good";
  return value <= thresholds.needs_improvement ? "needs_improvement" : "poor";
};

/** Value and unit as one string: "2.4s", "96ms", "0.14". */
export const formatMetric = (metric: PerformanceMetric, value: number): string =>
  `${formatMetricValue(metric, value)}${getMetricUnit(metric, value)}`;

// State colours, for rating marks and the chart's rating bands only. Measured
// lines and bars stay in the data hue.
export const RATING_TEXT_CLASS: Record<MetricRating, string> = {
  good: "text-green-600 dark:text-green-400",
  needs_improvement: "text-yellow-600 dark:text-yellow-400",
  poor: "text-red-600 dark:text-red-400",
};

export const RATING_COLOR: Record<MetricRating, string> = {
  good: "hsl(var(--green-400))",
  needs_improvement: "hsl(var(--yellow-400))",
  poor: "hsl(var(--red-400))",
};

/** The share of good loads a metric needs to pass, which is what "good at p75" means. */
export const PASSING_GOOD_SHARE = 75;

export type RatingSplit = {
  /** Loads that reported the metric. */
  count: number;
  good: number;
  needs_improvement: number;
  poor: number;
  /** Good loads as a percentage of `count`, 0–100. */
  goodShare: number;
};

/**
 * Splits the loads that reported a metric into the three ratings. The server
 * counts the measured, the good and the poor loads; the rest need improvement.
 * Null when nothing was measured: there is no share to speak of.
 */
export const getRatingSplit = (
  counts: Record<string, unknown> | null | undefined,
  metric: PerformanceMetric
): RatingSplit | null => {
  const count = Number(counts?.[`${metric}_count`]);
  const good = Number(counts?.[`${metric}_good`]);
  const poor = Number(counts?.[`${metric}_poor`]);
  if (!Number.isFinite(count) || !Number.isFinite(good) || !Number.isFinite(poor) || count <= 0) return null;

  return {
    count,
    good,
    needs_improvement: Math.max(0, count - good - poor),
    poor,
    goodShare: (good / count) * 100,
  };
};

/** A percentage of loads to one decimal: 77.34 → "77.3%". */
export const formatShare = (share: number): string => `${share.toFixed(1)}%`;

/**
 * The one row rated poor in a list, or null when none or several are. Fewer
 * than three rated rows is not a list worth singling one out of.
 */
export const findOnlyPoorRow = <T>(
  rows: T[],
  metric: PerformanceMetric,
  getValue: (row: T) => number | null | undefined
): T | null => {
  const rated = rows.filter(row => {
    const value = getValue(row);
    return typeof value === "number" && Number.isFinite(value);
  });
  if (rated.length < 3) return null;
  const poor = rated.filter(row => getMetricRating(metric, getValue(row) as number) === "poor");
  return poor.length === 1 ? poor[0] : null;
};
