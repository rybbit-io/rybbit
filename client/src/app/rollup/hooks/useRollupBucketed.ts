import { TimeBucket } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import {
  fetchOverviewBucketed,
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
}: {
  siteIds: number[];
  bucket: TimeBucket;
}): UseRollupBucketedResult {
  const { time, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters });

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: [
        "rollup-overview-bucketed",
        siteId,
        time,
        bucket,
        filters,
        timezone,
      ],
      queryFn: () => fetchOverviewBucketed(siteId, { ...params, bucket }),
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
