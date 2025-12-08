import { useQuery } from "@tanstack/react-query";
import { fetchOrgEventCount } from "../endpoints";

export function useGetOrgEventCount({
  organizationId,
  startDate,
  endDate,
  timeZone = "UTC",
}: {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}) {
  return useQuery({
    queryKey: ["org-event-count", organizationId, startDate, endDate, timeZone],
    queryFn: () =>
      fetchOrgEventCount(organizationId, {
        startDate,
        endDate,
        timeZone,
      }),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
