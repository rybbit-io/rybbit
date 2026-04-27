import { TimeBucket } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import {
  fetchOverviewBucketed,
  fetchOverviewBucketedLite,
  GetOverviewBucketedResponse,
} from "@/api/analytics/endpoints";
import { buildApiParams } from "@/api/utils";
import { useStore } from "@/lib/store";

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
  const { time, filters, timezone } = useStore();
  // Lite endpoints don't accept filters; drop them so the request and the
  // query key stay clean.
  const effectiveFilters = lite ? undefined : filters;
  const params = buildApiParams(time, { filters: effectiveFilters });

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: [
        lite ? "rollup-overview-bucketed-lite" : "rollup-overview-bucketed",
        siteId,
        time,
        bucket,
        effectiveFilters,
        timezone,
      ],
      queryFn: () => {
        const fetcher = lite ? fetchOverviewBucketedLite : fetchOverviewBucketed;
        return fetcher(siteId, { ...params, bucket });
      },
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
