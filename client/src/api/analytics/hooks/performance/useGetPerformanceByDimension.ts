import { Filter } from "@rybbit/shared";
import { UseQueryResult } from "@tanstack/react-query";
import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { PaginatedPerformanceResponse, PerformanceByDimensionItem } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

// Keep the old type for backward compatibility
export type PerformanceByPathItem = PerformanceByDimensionItem & {
  pathname: string;
};

type UseGetPerformanceByDimensionOptions = {
  site: number | string;
  dimension: string;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  additionalFilters?: Filter[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function useGetPerformanceByDimension({
  site,
  dimension,
  limit = 10,
  page = 1,
  useFilters = true,
  additionalFilters = [],
  sortBy,
  sortOrder,
}: UseGetPerformanceByDimensionOptions): UseQueryResult<PaginatedPerformanceResponse> {
  const { selectedPercentile } = usePerformanceStore();

  return useAnalyticsQuery<PaginatedPerformanceResponse>({
    key: "performance-by-dimension",
    path: "performance/by-dimension",
    site,
    useFilters,
    additionalFilters,
    params: {
      dimension,
      limit,
      page,
      percentile: selectedPercentile,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    staleTime: Infinity,
  });
}
