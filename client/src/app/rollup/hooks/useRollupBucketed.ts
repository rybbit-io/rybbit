import { TimeBucket } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import { buildAnalyticsRequest, fetchAnalytics } from "@/api/analytics/analyticsRequest";
import { GetOverviewBucketedResponse } from "@/api/analytics/endpoints";
import { useAnalyticsContext } from "@/api/analytics/useAnalyticsQuery";

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
  // Lite endpoints don't accept filters; drop them so the request and the
  // query key stay clean.
  const { context } = useAnalyticsContext({ useFilters: !lite });
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

  const series: RollupSeries[] = queries
    .map((q, i) => ({ siteId: siteIds[i], data: q.data }))
    .filter((s): s is RollupSeries => Array.isArray(s.data));

  return {
    series,
    isLoading: queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    error: (queries.find((q) => q.error)?.error as Error) ?? null,
  };
}
