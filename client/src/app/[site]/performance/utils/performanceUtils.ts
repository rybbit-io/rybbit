import { round } from "lodash";
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
