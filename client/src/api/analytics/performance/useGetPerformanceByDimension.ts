import { Filter } from "@rybbit/shared";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { usePerformanceStore } from "../../../app/[site]/performance/performanceStore";
import { useStore } from "../../../lib/store";
import { authedFetch, getQueryParams } from "../../utils";

type UseGetPerformanceByDimensionOptions = {
  site: number | string;
  dimension: string;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
  additionalFilters?: Filter[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

// Generic type that can represent any dimension
export type PerformanceByDimensionItem = {
  [key: string]: any; // The dimension field (pathname, country, etc.)
  event_count: number;
  lcp_avg: number | null;
  lcp_p50: number | null;
  lcp_p75: number | null;
  lcp_p90: number | null;
  lcp_p99: number | null;
  cls_avg: number | null;
  cls_p50: number | null;
  cls_p75: number | null;
  cls_p90: number | null;
  cls_p99: number | null;
  inp_avg: number | null;
  inp_p50: number | null;
  inp_p75: number | null;
  inp_p90: number | null;
  inp_p99: number | null;
  fcp_avg: number | null;
  fcp_p50: number | null;
  fcp_p75: number | null;
  fcp_p90: number | null;
  fcp_p99: number | null;
  ttfb_avg: number | null;
  ttfb_p50: number | null;
  ttfb_p75: number | null;
  ttfb_p90: number | null;
  ttfb_p99: number | null;
};

// Keep the old type for backward compatibility
export type PerformanceByPathItem = PerformanceByDimensionItem & {
  pathname: string;
};

type PaginatedPerformanceResponse = {
  data: PerformanceByDimensionItem[];
  totalCount: number;
};

export function useGetPerformanceByDimension({
  site,
  dimension,
  limit = 10,
  page = 1,
  useFilters = true,
  enabled = true,
  additionalFilters = [],
  sortBy,
  sortOrder,
}: UseGetPerformanceByDimensionOptions): UseQueryResult<PaginatedPerformanceResponse> {
  const { time, filters } = useStore();
  const { selectedPercentile } = usePerformanceStore();

  const queryParams = getQueryParams(time, {
    limit,
    page,
    percentile: selectedPercentile,
    filters: useFilters ? [...filters, ...additionalFilters] : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    dimension,
  });

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
    ],
    queryFn: async () => {
      const response = await authedFetch<{ data: any }>(`/performance/by-dimension/${site}`, queryParams);
      return response.data;
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
    enabled,
  });
}
