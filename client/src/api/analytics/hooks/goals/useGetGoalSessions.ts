import { useQuery } from "@tanstack/react-query";
import { Time } from "../../../../components/DateSelector/types";
import { buildApiParams } from "../../../utils";
import { fetchGoalSessions } from "../../endpoints";

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
  const params = buildApiParams(time);

  return useQuery({
    queryKey: ["goal-sessions", goalId, siteId, time, page, limit],
    queryFn: async () => {
      return fetchGoalSessions(siteId, {
        ...params,
        goalId,
        page,
        limit,
      });
    },
    enabled: !!siteId && !!goalId && enabled,
  });
}
