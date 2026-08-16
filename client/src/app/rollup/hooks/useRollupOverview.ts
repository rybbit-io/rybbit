import { useQueries } from "@tanstack/react-query";
import { buildAnalyticsRequest, fetchAnalytics } from "@/api/analytics/analyticsRequest";
import { GetOverviewResponse } from "@/api/analytics/endpoints";
import { useAnalyticsContext } from "@/api/analytics/useAnalyticsQuery";

export type RollupOverview = {
  siteId: number;
  data: GetOverviewResponse;
};

export type UseRollupOverviewResult = {
  overviews: RollupOverview[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
};

/**
 * Range totals per site, as opposed to the per-bucket series behind the chart.
 *
 * Unique users cannot be derived from the bucketed series: adding up per-bucket
 * distinct counts counts anyone active in two buckets twice, and the total then
 * moves when the bucket size changes. Only the server can count distinct users
 * over the whole range, so the stat cards read from here while the chart keeps
 * using the series. Users still can't be deduplicated *across* sites — identity
 * is per-site — so the total is a sum of per-site unique users.
 */
export function useRollupOverview({
  siteIds,
  lite = false,
}: {
  siteIds: number[];
  lite?: boolean;
}): UseRollupOverviewResult {
  // Lite endpoints don't accept filters; drop them so the request and the
  // query key stay clean.
  const { context } = useAnalyticsContext({ useFilters: !lite });
  const request = buildAnalyticsRequest({ path: lite ? "overview-lite" : "overview" }, context);

  const queries = useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: ["rollup-overview", siteId, request.path, request.params],
      queryFn: () => fetchAnalytics<GetOverviewResponse>(siteId, request),
      staleTime: 60_000,
    })),
  });

  const overviews: RollupOverview[] = queries
    .map((q, i) => ({ siteId: siteIds[i], data: q.data }))
    .filter((o): o is RollupOverview => !!o.data);

  return {
    overviews,
    isLoading: queries.some((q) => q.isLoading),
    isFetching: queries.some((q) => q.isFetching),
    error: (queries.find((q) => q.error)?.error as Error) ?? null,
  };
}
