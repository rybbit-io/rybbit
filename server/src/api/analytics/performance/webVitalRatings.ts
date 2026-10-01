import type { WebVitalMetric } from "@rybbit/shared";

/**
 * Google's Web Vitals limits: a value up to `good` is good, a value over
 * `poor` is poor, anything between needs improvement. The client rates the
 * percentiles it shows with the same numbers
 * (client/src/app/[site]/performance/utils/performanceUtils.ts).
 */
export const WEB_VITAL_LIMITS: Record<WebVitalMetric, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
};

export const WEB_VITAL_METRICS = Object.keys(WEB_VITAL_LIMITS) as WebVitalMetric[];

export const WEB_VITAL_RATING_COLUMNS = WEB_VITAL_METRICS.flatMap(metric => [
  `${metric}_count`,
  `${metric}_good`,
  `${metric}_poor`,
]);

/**
 * For each metric: how many loads reported it, and how many of those were good
 * and poor (the rest need improvement). A load that never reported a metric,
 * such as INP on a page nobody interacted with, counts towards none of the
 * three, so shares are of the loads that were actually measured.
 */
export const webVitalRatingCounts = (): string =>
  WEB_VITAL_METRICS.map(metric => {
    const { good, poor } = WEB_VITAL_LIMITS[metric];
    return `countIf(${metric} IS NOT NULL) AS ${metric}_count,
      countIf(${metric} IS NOT NULL AND ${metric} <= ${good}) AS ${metric}_good,
      countIf(${metric} IS NOT NULL AND ${metric} > ${poor}) AS ${metric}_poor`;
  }).join(",\n      ");
