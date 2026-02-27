import { getTimezone, useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getStartAndEndDate } from "../../../utils";
import {
  fetchErrorNames,
  ErrorNameItem,
  ErrorNamesPaginatedResponse,
  ErrorNamesStandardResponse,
} from "../../endpoints";

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
}: UseGetErrorNamesOptions): UseQueryResult<{ data: ErrorNamesPaginatedResponse }> {
  const { time, site, filters, timezone } = useStore();

  const { startDate, endDate } = getStartAndEndDate(time);

  return useQuery({
    queryKey: ["error-names", time, site, filters, limit, page, useFilters, timezone],
    queryFn: async () => {
      const data = await fetchErrorNames(site, {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        timeZone: getTimezone(),
        filters: useFilters ? filters : undefined,
        limit,
        page,
      });
      return { data };
    },
    staleTime: Infinity,
  });
}

// Hook for standard (non-paginated) fetching
export function useGetErrorNames({
  limit = 10,
  useFilters = true,
}: Omit<UseGetErrorNamesOptions, "page">): UseQueryResult<{ data: ErrorNamesPaginatedResponse }> {
  const { time, site, filters, timezone } = useStore();

  const { startDate, endDate } = getStartAndEndDate(time);

  return useQuery({
    queryKey: ["error-names", time, site, filters, limit, timezone],
    queryFn: async () => {
      const data = await fetchErrorNames(site, {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        timeZone: getTimezone(),
        filters: useFilters ? filters : undefined,
        limit,
      });
      return { data };
    },
    staleTime: Infinity,
  });
}
