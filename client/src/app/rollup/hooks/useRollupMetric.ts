import { FilterParameter } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { buildAnalyticsRequest, fetchAnalytics } from "@/api/analytics/analyticsRequest";
import { MetricResponse } from "@/api/analytics/endpoints";
import { querySignature, useRollupQueryContext, useSettledSnapshot } from "./useRollupQueryContext";

export type RollupMetricRow = MetricResponse;

export type UseRollupMetricResult = {
  data: RollupMetricRow[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
};

export function useRollupMetric({
  siteIds,
  parameter,
  limit = 100,
  lite = false,
}: {
  siteIds: number[];
  parameter: FilterParameter;
  limit?: number;
  lite?: boolean;
}): UseRollupMetricResult {
  const context = useRollupQueryContext(lite);
  const request = buildAnalyticsRequest(
    { path: lite ? "metric-lite" : "metric", params: { parameter, limit, page: 1 } },
    context
  );

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: ["rollup-metric", siteId, request.path, request.params],
      queryFn: () => fetchAnalytics<{ data: MetricResponse[]; totalCount: number }>(siteId, request),
      staleTime: 60_000,
    })),
  });

  const signature = querySignature(siteIds, queries);
  const merged = useMemo(() => {
    // Per-value accumulator. Sums sessions/pageviews and tracks weighted-sum
    // numerators + denominators for averages so we can recompute correctly
    // across sites at the end (rather than keeping the first site's value).
    type Acc = {
      value: string;
      title?: string;
      hostname?: string;
      count: number;
      pageviews: number;
      hasPageviews: boolean;
      bounceNum: number; // sum of bounce_rate * count, only where reported
      bounceDenom: number; // sum of count over rows that reported bounce
      durationNum: number; // sum of time_on_page * weight (pageviews or count)
      durationDenom: number; // sum of those weights
    };

    const accByValue = new Map<string, Acc>();
    let totalCount = 0;
    let totalPageviews = 0;

    for (const q of queries) {
      const rows = q.data?.data;
      if (!rows) continue;
      for (const row of rows) {
        totalCount += row.count;
        if (row.pageviews !== undefined) totalPageviews += row.pageviews;

        let acc = accByValue.get(row.value);
        if (!acc) {
          acc = {
            value: row.value,
            title: row.title,
            hostname: row.hostname,
            count: 0,
            pageviews: 0,
            hasPageviews: false,
            bounceNum: 0,
            bounceDenom: 0,
            durationNum: 0,
            durationDenom: 0,
          };
          accByValue.set(row.value, acc);
        }

        acc.count += row.count;

        if (row.pageviews !== undefined) {
          acc.pageviews += row.pageviews;
          acc.hasPageviews = true;
        }

        if (row.bounce_rate !== undefined) {
          acc.bounceNum += row.bounce_rate * row.count;
          acc.bounceDenom += row.count;
        }

        if (row.time_on_page_seconds !== undefined) {
          const weight = row.pageviews ?? row.count;
          acc.durationNum += row.time_on_page_seconds * weight;
          acc.durationDenom += weight;
        }
      }
    }

    const rows: RollupMetricRow[] = Array.from(accByValue.values()).map((a) => {
      const out: RollupMetricRow = {
        value: a.value,
        title: a.title,
        hostname: a.hostname,
        count: a.count,
        percentage: totalCount > 0 ? (a.count / totalCount) * 100 : 0,
      };
      if (a.hasPageviews) {
        out.pageviews = a.pageviews;
        out.pageviews_percentage =
          totalPageviews > 0 ? (a.pageviews / totalPageviews) * 100 : 0;
      }
      if (a.bounceDenom > 0) {
        out.bounce_rate = a.bounceNum / a.bounceDenom;
      }
      if (a.durationDenom > 0) {
        out.time_on_page_seconds = a.durationNum / a.durationDenom;
      }
      return out;
    });

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [signature]);
  const settled = useSettledSnapshot(merged, queries);

  return {
    data: settled.data ?? [],
    isLoading: settled.isLoading,
    isFetching: queries.some((q) => q.isFetching),
    error: (queries.find((q) => q.error)?.error as Error) ?? null,
  };
}
