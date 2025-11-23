import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { APIResponse } from "../../types";
import { authedFetch, getQueryParams } from "../../utils";

// This should match ErrorNameItem from the backend
export type ErrorNameItem = {
  value: string; // Error message
  errorName: string; // Error type (TypeError, ReferenceError, etc.)
  count: number; // Total occurrences
  sessionCount: number; // Unique sessions affected
  percentage: number;
};

// This should match the paginated response structure from getErrorNames.ts
export type ErrorNamesPaginatedResponse = {
  data: ErrorNameItem[];
  totalCount: number;
};

// This is for non-paginated use by StandardSection (or similar)
export type ErrorNamesStandardResponse = ErrorNameItem[];

type UseGetErrorNamesOptions = {
  limit?: number;
  page?: number;
  useFilters?: boolean;
};

// Hook for paginated fetching (e.g., for a dedicated "All Errors" screen)
export function useGetErrorNamesPaginated({
  limit = 10,
  page = 1,
  useFilters = true,
}: UseGetErrorNamesOptions): UseQueryResult<APIResponse<ErrorNamesPaginatedResponse>> {
  const { time, site, filters } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    limit,
    page,
    filters: useFilters ? filters : undefined,
  };

  return useQuery({
    queryKey: ["error-names", time, site, filters, limit, page],
    queryFn: () => {
      return authedFetch<APIResponse<ErrorNamesPaginatedResponse>>(`/error-names/${site}`, queryParams);
    },
    staleTime: Infinity,
  });
}

// Hook for standard (non-paginated) fetching
export function useGetErrorNames({
  limit = 10,
  useFilters = true,
}: Omit<UseGetErrorNamesOptions, "page">): UseQueryResult<APIResponse<ErrorNamesStandardResponse>> {
  const { time, site, filters } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    limit,
    filters: useFilters ? filters : undefined,
  };

  return useQuery({
    queryKey: ["error-names", time, site, filters, limit],
    queryFn: () => {
      return authedFetch<APIResponse<ErrorNamesStandardResponse>>(`/error-names/${site}`, queryParams);
    },
    staleTime: Infinity,
  });
}
