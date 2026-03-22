import { authedFetch } from "../../utils";

export type EventCountRow = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  outbound_count: number;
  error_count: number;
  button_click_count: number;
  copy_count: number;
  form_submit_count: number;
  input_change_count: number;
  event_count: number;
};

export type ServiceEventCountResponse = EventCountRow[];

export type GetServiceEventCountResponse = {
  data: ServiceEventCountResponse;
};

export interface GetAdminServiceEventCountParams {
  startDate?: string;
  endDate?: string;
  timeZone: string;
}

export function getAdminServiceEventCount({
  startDate,
  endDate,
  timeZone,
}: GetAdminServiceEventCountParams): Promise<GetServiceEventCountResponse> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (timeZone) params.append("time_zone", timeZone);

  return authedFetch("/admin/service-event-count", Object.fromEntries(params));
}
