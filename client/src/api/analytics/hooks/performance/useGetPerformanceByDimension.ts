import { Filter } from "@rybbit/shared";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchPerformanceByDimension, PaginatedPerformanceResponse, PerformanceByDimensionItem } from "../../endpoints";

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
  const { time, filters, timezone } = useStore();
  const { selectedPercentile } = usePerformanceStore();

  const combinedFilters = useFilters ? [...filters, ...additionalFilters] : undefined;
  const params = buildApiParams(time, { filters: combinedFilters });

  return useQuery({
    queryKey: [
      "performance-by-dimension",
      dimension,
      time,
      site,
      filters,
      selectedPercentile,
      limit,
      page,
      additionalFilters,
      sortBy,
      sortOrder,
      timezone,
    ],
    queryFn: () => {
      return fetchPerformanceByDimension(site, {
        ...params,
        dimension,
        limit,
        page,
        percentile: selectedPercentile,
        sortBy,
        sortOrder,
      });
    },
    staleTime: Infinity,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey;
      const [, , , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    enabled: !!site,
  });
}
