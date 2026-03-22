import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchOverview } from "../endpoints";

type PeriodTime = "current" | "previous";

type UseGetOverviewOptions = {
  periodTime?: PeriodTime;
  site?: number | string;
  overrideTime?:
    | { mode: "past-minutes"; pastMinutesStart: number; pastMinutesEnd: number }
    | { mode: "range"; startDate: string; endDate: string };
    useFilters?: boolean;
};

export function useGetOverview({ periodTime, site, overrideTime, useFilters = true }: UseGetOverviewOptions) {
  const { time, previousTime, filters, timezone } = useStore();

  // Use overrideTime if provided, otherwise use store time
  const baseTime = overrideTime || time;
  const timeToUse = periodTime === "previous" ? previousTime : baseTime;

  const params = buildApiParams(timeToUse, { filters: useFilters ? filters : undefined });
  const queryKey = ["overview", timeToUse, site, filters, useFilters, timezone];

  return useQuery({
    queryKey,
    queryFn: () => {
      return fetchOverview(site!, params).then(data => ({ data }));
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
    enabled: !!site,
  });
}
