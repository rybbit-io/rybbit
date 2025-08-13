import { useQuery } from "@tanstack/react-query";
import { authedFetch, getStartAndEndDate } from "../utils";
import { Time } from "../../components/DateSelector/types";
import { timeZone } from "../../lib/dateTimeUtils";

export interface JourneyParams {
  siteId?: number;
  steps?: number;
  timeZone?: string;
  time: Time;
  limit?: number;
}

export interface Journey {
  path: string[];
  count: number;
  percentage: number;
}

export interface JourneysResponse {
  journeys: Journey[];
}

export const useJourneys = ({ siteId, steps = 3, time, limit = 100 }: JourneyParams) => {
  const { startDate, endDate } = getStartAndEndDate(time);

  return useQuery<JourneysResponse>({
    queryKey: ["journeys", siteId, steps, startDate, endDate, timeZone, limit],
    queryFn: async () => {
      const params: Record<string, any> = {};

      if (steps) params.steps = steps;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (timeZone) params.timeZone = timeZone;
      if (limit) params.limit = limit;

      return authedFetch<JourneysResponse>(`/journeys/${siteId}`, params);
    },
    enabled: !!siteId,
  });
};
