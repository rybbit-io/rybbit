"use client";

import { FilterParameter } from "@rybbit/shared";
import { useQueries } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { buildAnalyticsRequest, fetchAnalytics } from "../../../../../api/analytics/analyticsRequest";
import { MetricResponse } from "../../../../../api/analytics/endpoints";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { useAnalyticsContext } from "../../../../../api/analytics/useAnalyticsQuery";

type ValueOptions = { data: MetricResponse[]; totalCount: number };

/**
 * Sites whose values the filter picker suggests. Unset (null) means the
 * store's current site, which is what every site dashboard wants; the rollup
 * page sets it so suggestions come from all of its sites at once.
 */
export const FilterValueSitesContext = createContext<number[] | null>(null);

const SUGGESTION_LIMIT = 1000;

/** Value suggestions for a filter dimension, from one site or several. */
export function useFilterValueOptions(parameter: FilterParameter): {
  data: ValueOptions | undefined;
  isFetching: boolean;
} {
  const siteIds = useContext(FilterValueSitesContext);

  const single = useMetric({
    parameter,
    limit: SUGGESTION_LIMIT,
    useFilters: false,
    enabled: siteIds === null,
  });

  const { context } = useAnalyticsContext({ useFilters: false });
  const request = buildAnalyticsRequest(
    { path: "metric", params: { parameter, limit: SUGGESTION_LIMIT } },
    context
  );
  const queries = useQueries({
    queries: (siteIds ?? []).map(siteId => ({
      queryKey: ["filter-value-options", siteId, request.path, request.params],
      queryFn: () => fetchAnalytics<ValueOptions>(siteId, request),
      staleTime: 60_000,
    })),
  });

  // Site ids too: a new set of not-yet-loaded sites has the same all-zero
  // timestamps as the last one and must not reuse its merged values.
  const signature = `${parameter}|${(siteIds ?? []).join(",")}|${queries.map(q => q.dataUpdatedAt).join(",")}`;
  const merged = useMemo(() => {
    const counts = new Map<string, MetricResponse>();
    for (const q of queries) {
      for (const row of q.data?.data ?? []) {
        const existing = counts.get(row.value);
        if (existing) existing.count += row.count;
        else counts.set(row.value, { ...row });
      }
    }
    const data = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    return { data, totalCount: data.length };
  }, [signature]);

  if (siteIds === null) return { data: single.data, isFetching: single.isFetching };
  return { data: merged, isFetching: queries.some(q => q.isFetching) };
}
