import { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { AnalyticsContext } from "@/api/analytics/analyticsRequest";
import { useAnalyticsContext } from "@/api/analytics/useAnalyticsQuery";
import { useRollupFilters } from "../lib/rollupFilters";

/**
 * Time window from the main store, filters from the rollup's own store. Lite
 * endpoints don't accept filters, so they get none and their query keys stay
 * clean.
 */
export function useRollupQueryContext(lite: boolean): AnalyticsContext {
  const { context } = useAnalyticsContext({ useFilters: false });
  const filters = useRollupFilters(state => state.filters);
  return lite || filters.length === 0 ? context : { ...context, filters };
}

/** Changes whenever the set of queries or any of their results changes. */
export const querySignature = (siteIds: number[], queries: UseQueryResult[]) =>
  `${siteIds.join(",")}|${queries.map(q => q.dataUpdatedAt).join(",")}`;

/**
 * Each site is its own request, so results land one at a time. Rendering them
 * as they land makes the chart and totals climb site by site. Instead hold the
 * last fully-settled result until every site in the current set has answered
 * (including background refetches), then swap it in at once. `value` must be memoised on the query results.
 */
export function useSettledSnapshot<T>(
  value: T,
  queries: UseQueryResult[]
): { data: T | undefined; isLoading: boolean } {
  const hasAllData = queries.every(q => !q.isPending);
  // Background refetches land one site at a time too, so wait for them as well.
  const settled = hasAllData && queries.every(q => !q.isFetching);
  const [snapshot, setSnapshot] = useState<{ value: T } | null>(null);
  // Cached data that is refetching on mount is still a complete first frame.
  if ((settled || (hasAllData && snapshot === null)) && snapshot?.value !== value) {
    setSnapshot({ value });
  }
  if (settled) return { data: value, isLoading: false };
  if (snapshot) return { data: snapshot.value, isLoading: false };
  return { data: hasAllData ? value : undefined, isLoading: !hasAllData };
}
