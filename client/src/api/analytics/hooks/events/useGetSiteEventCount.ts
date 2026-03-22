import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchSiteEventCount } from "../../endpoints";

export function useGetSiteEventCount() {
  const { site, time, bucket, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["site-event-count", site, time, bucket, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () =>
      fetchSiteEventCount(site, {
        ...params,
        bucket,
      }),
  });
}
