import { useQuery } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { JOURNEY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchJourneys, Journey, JourneysResponse } from "../endpoints";

export interface JourneyParams {
  siteId?: number;
  steps?: number;
  timeZone?: string;
  time: Time;
  limit?: number;
  stepFilters?: Record<number, string>;
}

export const useJourneys = ({ siteId, steps = 3, time, limit = 100, stepFilters }: JourneyParams) => {
  const { timezone } = useStore();
  const filteredFilters = getFilteredFilters(JOURNEY_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery<JourneysResponse>({
    queryKey: ["journeys", siteId, steps, time, limit, filteredFilters, stepFilters, timezone],
    queryFn: () =>
      fetchJourneys(siteId!, {
        ...params,
        steps,
        limit,
        stepFilters,
      }),
    enabled: !!siteId,
    placeholderData: previousData => previousData,
  });
};
