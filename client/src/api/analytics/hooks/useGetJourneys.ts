import { Filter } from "@rybbit/shared";
import { Time } from "../../../components/DateSelector/types";
import { JOURNEY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { fetchJourneys, JourneysParams as JourneysApiParams, JourneysResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

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
  const filteredFilters = getFilteredFilters(JOURNEY_PAGE_FILTERS);
  const combinedFilters = additionalFilters?.length ? [...filteredFilters, ...additionalFilters] : filteredFilters;

  return useAnalyticsQuery<JourneysResponse, JourneysApiParams>({
    key: "journeys",
    site: siteId,
    overrideTime: time,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: combinedFilters.length > 0,
    customFilters: combinedFilters,
    extraParams: { steps, limit, stepFilters },
    enabled: siteId !== undefined,
    fetch: (site, params) => fetchJourneys(site, params),
  });
};
