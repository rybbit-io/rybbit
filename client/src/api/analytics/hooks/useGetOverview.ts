import { Time } from "../../../components/DateSelector/types";
import { fetchOverview, fetchOverviewLite } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

type UseGetOverviewOptions = {
  periodTime?: PeriodTime;
  site?: number | string;
  overrideTime?: Time;
  useFilters?: boolean;
  // Read the MV-backed lite endpoint instead of the raw-events one.
  lite?: boolean;
};

export function useGetOverview({ periodTime, site, overrideTime, useFilters = true, lite = false }: UseGetOverviewOptions) {
  return useAnalyticsQuery({
    key: "overview",
    site,
    periodTime,
    overrideTime,
    useFilters,
    keyExtras: [lite],
    fetch: (site, params) => (lite ? fetchOverviewLite : fetchOverview)(site, params).then(data => ({ data })),
  });
}
