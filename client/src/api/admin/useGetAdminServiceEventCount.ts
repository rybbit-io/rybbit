import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../utils";

export type ServiceEventCountResponse = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  event_count: number;
}[];

export type GetServiceEventCountResponse = {
  data: ServiceEventCountResponse;
};

async function getAdminServiceEventCount({
  startDate,
  endDate,
  timeZone,
}: {
  startDate?: string;
  endDate?: string;
  timeZone: string;
}): Promise<GetServiceEventCountResponse> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (timeZone) params.append("time_zone", timeZone);

  return authedFetch("/admin/service-event-count", Object.fromEntries(params));
}

export function useGetAdminServiceEventCount({
  startDate,
  endDate,
  timeZone,
}: {
  startDate?: string;
  endDate?: string;
  timeZone: string;
}) {
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
