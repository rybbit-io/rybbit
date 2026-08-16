import { Time } from "../../../../components/DateSelector/types";
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
  return useAnalyticsQuery<GetSessionsResponse>({
    key: ["goal-sessions", goalId],
    path: `goals/${goalId}/sessions`,
    site: siteId,
    overrideTime: time,
    useFilters: false,
    params: { page, limit },
    enabled: !!goalId && enabled,
  });
}
