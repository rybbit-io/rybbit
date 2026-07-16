import { Filter } from "@rybbit/shared";
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
  // Merged with the store filters (e.g. scoping journeys to a single user)
  additionalFilters?: Filter[];
}

export const useJourneys = ({ siteId, steps = 3, time, limit = 100, stepFilters, additionalFilters }: JourneyParams) => {
  const { timezone } = useStore();
  const filteredFilters = getFilteredFilters(JOURNEY_PAGE_FILTERS);
  const combinedFilters = additionalFilters?.length ? [...filteredFilters, ...additionalFilters] : filteredFilters;
  const params = buildApiParams(time, { filters: combinedFilters });

  return useQuery<JourneysResponse>({
    queryKey: ["journeys", siteId, steps, time, limit, combinedFilters, stepFilters, timezone],
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
