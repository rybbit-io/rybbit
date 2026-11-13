import { useQuery } from "@tanstack/react-query";

import { EventExportParams, fetchEventExportCount } from "../endpoints";

/**
 * Size of a raw event export for the Export settings tab. Driven by that tab's
 * own range picker, not the dashboard's time range or filters.
 */
export function useGetEventExportCount(
  siteId: number,
  params: EventExportParams,
  { enabled = true }: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ["event-export-count", siteId, params.startDate, params.endDate, params.timeZone],
    queryFn: () => fetchEventExportCount(siteId, params),
    staleTime: 60_000,
    enabled,
  });
}
