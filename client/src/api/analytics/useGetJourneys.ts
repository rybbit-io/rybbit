import { useQuery } from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { JOURNEY_PAGE_FILTERS } from "../../lib/filterGroups";
import { getFilteredFilters } from "../../lib/store";
import { authedFetch, getQueryParams } from "../utils";

export interface JourneyParams {
  siteId?: number;
  steps?: number;
  timeZone?: string;
  time: Time;
  limit?: number;
  stepFilters?: Record<number, string>;
}

export interface Journey {
  path: string[];
  count: number;
  percentage: number;
}

export interface JourneysResponse {
  journeys: Journey[];
}

export const useJourneys = ({ siteId, steps = 3, time, limit = 100, stepFilters }: JourneyParams) => {
  const filteredFilters = getFilteredFilters(JOURNEY_PAGE_FILTERS);

  return useQuery<JourneysResponse>({
    queryKey: ["journeys", siteId, steps, time, limit, filteredFilters, stepFilters],
    queryFn: async () => {
      const params = getQueryParams(time, {
        steps,
        limit,
        filters: filteredFilters,
        stepFilters: stepFilters && Object.keys(stepFilters).length > 0 ? JSON.stringify(stepFilters) : undefined,
      });
      return authedFetch<JourneysResponse>(`/journeys/${siteId}`, params);
    },
    enabled: !!siteId,
    placeholderData: previousData => previousData,
  });
};
