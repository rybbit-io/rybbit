import { useQuery } from "@tanstack/react-query";
import { getAdminServiceEventCount, GetAdminServiceEventCountParams } from "../endpoints";

export function useGetAdminServiceEventCount({
  startDate,
  endDate,
  timeZone,
}: GetAdminServiceEventCountParams) {
  return useQuery({
    queryKey: ["admin-service-event-count", startDate, endDate, timeZone],
    queryFn: () =>
      getAdminServiceEventCount({
        startDate,
        endDate,
        timeZone,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
