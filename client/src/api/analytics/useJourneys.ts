import { useQuery } from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { timeZone } from "../../lib/dateTimeUtils";
import { getFilteredFilters, JOURNEY_PAGE_FILTERS } from "../../lib/store";
import { authedFetch, getStartAndEndDate } from "../utils";

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
  const { startDate, endDate } = getStartAndEndDate(time);

  const filteredFilters = getFilteredFilters(JOURNEY_PAGE_FILTERS);

  return useQuery<JourneysResponse>({
    queryKey: ["journeys", siteId, steps, startDate, endDate, timeZone, limit, filteredFilters, stepFilters],
    queryFn: async () => {
      const params: Record<string, any> = {};

      if (steps) params.steps = steps;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (timeZone) params.timeZone = timeZone;
      if (limit) params.limit = limit;
      if (filteredFilters) params.filters = filteredFilters;
      if (stepFilters && Object.keys(stepFilters).length > 0) {
        params.stepFilters = JSON.stringify(stepFilters);
      }

      return authedFetch<JourneysResponse>(`/journeys/${siteId}`, params);
    },
    enabled: !!siteId,
    placeholderData: (previousData) => previousData,
  });
};
