import { useQuery } from "@tanstack/react-query";
import {
  useStore,
  getFilteredFilters,
  EVENT_FILTERS,
} from "../../../lib/store";
import { authedFetch } from "../../utils";
import { getQueryTimeParams } from "../utils";

export type EventName = {
  eventName: string;
  count: number;
};

export function useGetEventNames() {
  const { site, time, filters } = useStore();

  const timeParams = getQueryTimeParams(time);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useQuery({
    queryKey: ["event-names", site, timeParams, filteredFilters],
    enabled: !!site,
    queryFn: () => {
      const params = {
        ...Object.fromEntries(new URLSearchParams(timeParams)),
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
      };

      return authedFetch<{ data: EventName[] }>(
        `/events/names/${site}`,
        params
      ).then((res) => res.data);
    },
  });
}
