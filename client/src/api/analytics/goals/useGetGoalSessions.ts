import { useQuery } from "@tanstack/react-query";
import { authedFetch, getQueryParams } from "../../utils";
import { GetSessionsResponse } from "../useGetUserSessions";
import { Time } from "../../../components/DateSelector/types";

interface GoalSessionsResponse {
  data: GetSessionsResponse;
}

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
  const timeParams = getQueryParams(time);

  return useQuery({
    queryKey: ["goal-sessions", goalId, siteId, timeParams, page, limit],
    queryFn: async () => {
      return authedFetch<GoalSessionsResponse>(`/goals/${goalId}/sessions/${siteId}`, {
        ...timeParams,
        page,
        limit,
      });
    },
    enabled: !!siteId && !!goalId && enabled,
  });
}
