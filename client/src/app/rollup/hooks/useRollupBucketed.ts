import { TimeBucket } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { buildAnalyticsRequest, fetchAnalytics } from "@/api/analytics/analyticsRequest";
import { GetOverviewBucketedResponse } from "@/api/analytics/endpoints";
import { querySignature, useRollupQueryContext, useSettledSnapshot } from "./useRollupQueryContext";

export type RollupSeries = {
  siteId: number;
  data: GetOverviewBucketedResponse;
};

export type UseRollupBucketedResult = {
  series: RollupSeries[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
};

export function useRollupBucketed({
  siteIds,
  bucket,
  lite = false,
}: {
  siteIds: number[];
  bucket: TimeBucket;
  lite?: boolean;
}): UseRollupBucketedResult {
  const context = useRollupQueryContext(lite);
  const request = buildAnalyticsRequest(
    { path: lite ? "overview-bucketed-lite" : "overview/time-series", params: { bucket } },
    context
  );

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: ["rollup-overview-bucketed", siteId, request.path, request.params],
      queryFn: () => fetchAnalytics<GetOverviewBucketedResponse>(siteId, request),
      staleTime: 60_000,
    })),
  });

  const signature = querySignature(siteIds, queries);
  const series = useMemo(
    () =>
      queries
        .map((q, i) => ({ siteId: siteIds[i], data: q.data }))
        .filter((s): s is RollupSeries => Array.isArray(s.data)),
    [signature]
  );
  const settled = useSettledSnapshot(series, queries);

  return {
    series: settled.data ?? [],
    isLoading: settled.isLoading,
    isFetching: queries.some((q) => q.isFetching),
    error: (queries.find((q) => q.error)?.error as Error) ?? null,
  };
}
