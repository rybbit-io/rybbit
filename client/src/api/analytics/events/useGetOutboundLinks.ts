import { useQuery } from "@tanstack/react-query";
import {
  useStore,
  getFilteredFilters,
  EVENT_FILTERS,
} from "../../../lib/store";
import { authedFetch, getQueryParams } from "../../utils";

export type OutboundLink = {
  url: string;
  count: number;
  lastClicked: string;
};

export function useGetOutboundLinks() {
  const { site, time, filters } = useStore();

  const timeParams = getQueryParams(time);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useQuery({
    queryKey: ["outbound-links", site, timeParams, filteredFilters],
    enabled: !!site,
    queryFn: () => {
      const params = {
        ...timeParams,
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
      };

      return authedFetch<{ data: OutboundLink[] }>(
        `/events/outbound/${site}`,
        params
      ).then((res) => res.data);
    },
  });
}