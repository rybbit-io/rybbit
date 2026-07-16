import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Time } from "../../../components/DateSelector/types";
import { getTimezone, useStore } from "../../../lib/store";
import { getStartAndEndDate } from "../../utils";
import { fetchGSCData, GSCDimension } from "../endpoints";

// The GSC API only accepts whole-day date ranges and keeps ~16 months of
// history, so sub-day dashboard ranges are widened to whole days and
// all-time is clamped to Google's maximum lookback.
function getGSCDateRange(time: Time): { startDate: string; endDate: string } {
  const today = DateTime.now().setZone(getTimezone());
  if (time.mode === "past-minutes") {
    return {
      startDate: today.minus({ minutes: time.pastMinutesStart }).toISODate() ?? "",
      endDate: today.toISODate() ?? "",
    };
  }
  if (time.mode === "all-time") {
    return {
      startDate: today.minus({ months: 16 }).toISODate() ?? "",
      endDate: today.toISODate() ?? "",
    };
  }
  const { startDate, endDate } = getStartAndEndDate(time);
  return { startDate: startDate ?? "", endDate: endDate ?? "" };
}

/**
 * Hook to fetch data from Google Search Console for a specific dimension
 */
export function useGetGSCData(dimension: GSCDimension) {
  const { site, time, timezone } = useStore();
  const { startDate, endDate } = getGSCDateRange(time);

  return useQuery({
    queryKey: ["gsc-data", dimension, site, startDate, endDate, timezone],
    queryFn: () => {
      return fetchGSCData(site!, {
        dimension,
        startDate,
        endDate,
        // Resolve the "system" sentinel — the API needs a real IANA zone
        timeZone: getTimezone(),
      });
    },
    enabled: !!site,
    // Refetch less frequently since GSC data updates slowly
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
