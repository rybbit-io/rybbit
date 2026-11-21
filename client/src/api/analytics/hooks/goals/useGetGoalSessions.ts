import { Time } from "../../../../components/DateSelector/types";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { GetSessionsResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetGoalSessions({
  goalId,
  siteId,
  time,
  page = 1,
  limit = 25,
  enabled = false,
}: {
  goalId: number;
  siteId: number;
  time: Time;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GetSessionsResponse>({
    key: ["goal-sessions", goalId],
    path: `goals/${goalId}/sessions`,
    site: siteId,
    overrideTime: time,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { page, limit },
    enabled: !!goalId && enabled,
  });
}
