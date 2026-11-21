import { Filter } from "@rybbit/shared";
import { UseQueryResult } from "@tanstack/react-query";
import { PaginatedPerformanceResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

type UseGetPerformanceByDimensionOptions = {
  site: number | string;
  dimension: string;
  periodTime?: PeriodTime;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  additionalFilters?: Filter[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  enabled?: boolean;
};

// The response carries every percentile, so the percentile picker never refetches.
export function useGetPerformanceByDimension({
  site,
  dimension,
  periodTime,
  limit = 10,
  page = 1,
  useFilters = true,
  additionalFilters = [],
  sortBy,
  sortOrder,
  enabled,
}: UseGetPerformanceByDimensionOptions): UseQueryResult<PaginatedPerformanceResponse> {
  return useAnalyticsQuery<PaginatedPerformanceResponse>({
    key: "performance-by-dimension",
    path: "performance/by-dimension",
    site,
    periodTime,
    useFilters,
    additionalFilters,
    params: {
      dimension,
      limit,
      page,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    staleTime: Infinity,
    enabled,
  });
}
