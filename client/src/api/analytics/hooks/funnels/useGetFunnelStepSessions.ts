import { Time } from "../../../../components/DateSelector/types";
import { FUNNEL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import {
  fetchFunnelStepSessions,
  FunnelStep,
  FunnelStepSessionsParams,
  GetSessionsResponse,
} from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetFunnelStepSessions({
  steps,
  stepNumber,
  siteId,
  time,
  mode,
  page = 1,
  limit = 25,
  enabled = false,
}: {
  steps: FunnelStep[];
  stepNumber: number;
  siteId: number;
  time: Time;
  mode: "reached" | "dropped";
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  // Only the funnel page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(FUNNEL_PAGE_FILTERS);

  return useAnalyticsQuery<{ data: GetSessionsResponse }, FunnelStepSessionsParams>({
    key: "funnel-step-sessions",
    site: siteId,
    overrideTime: time,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { steps, stepNumber, mode, page, limit },
    enabled: !!steps && steps.length >= 2 && enabled,
    fetch: (site, params) => fetchFunnelStepSessions(site, params),
  });
}
