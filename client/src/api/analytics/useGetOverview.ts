import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch, getQueryParams } from "../utils";

export type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

type PeriodTime = "current" | "previous";

type UseGetOverviewOptions = {
  periodTime?: PeriodTime;
  site?: number | string;
  overrideTime?:
    | { mode: "past-minutes"; pastMinutesStart: number; pastMinutesEnd: number }
    | { mode: "range"; startDate: string; endDate: string };
};

export function useGetOverview({ periodTime, site, overrideTime }: UseGetOverviewOptions) {
  const { time, previousTime, filters } = useStore();

  // Use overrideTime if provided, otherwise use store time
  const baseTime = overrideTime || time;
  const timeToUse = periodTime === "previous" ? previousTime : baseTime;

  const queryParams = getQueryParams(timeToUse, { filters });

  const queryKey = ["overview", timeToUse, site, filters];

  return useQuery({
    queryKey,
    queryFn: () => {
      return authedFetch<{ data: GetOverviewResponse }>(`/overview/${site}`, queryParams);
    },
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey;
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
  });
}
