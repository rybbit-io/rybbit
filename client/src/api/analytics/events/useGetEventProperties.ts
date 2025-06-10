import { useQuery } from "@tanstack/react-query";
import {
  useStore,
  getFilteredFilters,
  EVENT_FILTERS,
} from "../../../lib/store";
import { authedFetch } from "../../utils";
import { getQueryTimeParams } from "../utils";

export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

export function useGetEventProperties(eventName: string | null) {
  const { site, time, filters } = useStore();

  const timeParams = getQueryTimeParams(time);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useQuery({
    queryKey: [
      "event-properties",
      site,
      eventName,
      timeParams,
      filteredFilters,
    ],
    enabled: !!site && !!eventName,
    queryFn: () => {
      const params = {
        ...Object.fromEntries(new URLSearchParams(timeParams)),
        eventName,
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
      };

      return authedFetch<{ data: EventProperty[] }>(
        `/events/properties/${site}`,
        params
      ).then((res) => res.data);
    },
  });
}
