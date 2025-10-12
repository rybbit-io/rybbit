import { useQuery } from "@tanstack/react-query";
import { useStore, getFilteredFilters, EVENT_FILTERS } from "../../../lib/store";
import { authedFetch, getQueryParams } from "../../utils";

export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

export function useGetEventProperties(eventName: string | null) {
  const { site, time, filters } = useStore();

  const timeParams = getQueryParams(time);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useQuery({
    queryKey: ["event-properties", site, eventName, timeParams, filteredFilters],
    enabled: !!site && !!eventName,
    queryFn: () => {
      const params = {
        ...timeParams,
        eventName,
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
      };

      return authedFetch<{ data: EventProperty[] }>(`/events/properties/${site}`, params).then(res => res.data);
    },
  });
}
