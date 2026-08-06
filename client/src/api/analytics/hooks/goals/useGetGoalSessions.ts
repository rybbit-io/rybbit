import { Time } from "../../../../components/DateSelector/types";
import { fetchGoalSessions, GetSessionsResponse, GoalSessionsParams } from "../../endpoints";
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
  return useAnalyticsQuery<{ data: GetSessionsResponse }, GoalSessionsParams>({
    key: "goal-sessions",
    site: siteId,
    overrideTime: time,
    useFilters: false,
    extraParams: { goalId, page, limit },
    enabled: !!goalId && enabled,
    fetch: (site, params) => fetchGoalSessions(site, params),
  });
}
