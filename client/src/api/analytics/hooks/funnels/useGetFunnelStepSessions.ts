import { useQuery } from "@tanstack/react-query";
import { Time } from "../../../../components/DateSelector/types";
import { FUNNEL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchFunnelStepSessions, FunnelStep } from "../../endpoints";

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
  const { timezone } = useStore();
  const filteredFilters = getFilteredFilters(FUNNEL_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery({
    queryKey: ["funnel-step-sessions", steps, stepNumber, siteId, time, mode, page, limit, filteredFilters, timezone],
    queryFn: async () => {
      return fetchFunnelStepSessions(siteId, {
        ...params,
        steps,
        stepNumber,
        mode,
        page,
        limit,
      });
    },
    enabled: !!siteId && !!steps && steps.length >= 2 && enabled,
  });
}
