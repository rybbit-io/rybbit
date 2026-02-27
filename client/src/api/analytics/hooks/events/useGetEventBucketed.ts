import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchEventBucketed } from "../../endpoints";

export function useGetEventBucketed({ limit = 5 }: { limit?: number } = {}) {
  const { site, time, bucket, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["event-bucketed", site, time, bucket, filteredFilters, limit, timezone],
    enabled: !!site,
    queryFn: () =>
      fetchEventBucketed(site, {
        ...params,
        bucket,
        limit,
      }),
  });
}
