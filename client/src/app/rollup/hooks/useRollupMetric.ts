import { FilterParameter } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchMetric, MetricResponse } from "@/api/analytics/endpoints";
import { buildApiParams } from "@/api/utils";
import { useStore } from "@/lib/store";

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
}: {
  siteIds: number[];
  parameter: FilterParameter;
  limit?: number;
}): UseRollupMetricResult {
  const { time, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters });

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: [
        "rollup-metric",
        parameter,
        siteId,
        time,
        filters,
        limit,
        timezone,
      ],
      queryFn: () =>
        fetchMetric(siteId, { ...params, parameter, limit, page: 1 }),
      staleTime: 60_000,
    })),
  });

  const merged = useMemo(() => {
    const totalsByValue = new Map<string, RollupMetricRow>();
    let totalCount = 0;

    for (const q of queries) {
      const rows = q.data?.data;
      if (!rows) continue;
      for (const row of rows) {
        totalCount += row.count;
        const existing = totalsByValue.get(row.value);
        if (existing) {
          existing.count += row.count;
          if (row.pageviews !== undefined) {
            existing.pageviews = (existing.pageviews ?? 0) + row.pageviews;
          }
        } else {
          totalsByValue.set(row.value, {
            ...row,
            // percentage will be recomputed below
            percentage: 0,
            pageviews_percentage: 0,
          });
        }
      }
    }

    const rows = Array.from(totalsByValue.values()).map((r) => ({
      ...r,
      percentage: totalCount > 0 ? (r.count / totalCount) * 100 : 0,
    }));
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [queries.map((q) => q.dataUpdatedAt).join(",")]);

  return {
    data: merged,
    isLoading: queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    error: (queries.find((q) => q.error)?.error as Error) ?? null,
  };
}
