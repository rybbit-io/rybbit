import type { Dashboard, DashboardConfig, TimeBucket } from "@rybbit/shared";
import { authedFetch } from "../../utils";
import type { CommonApiParams } from "./types";

export function fetchDashboards(site: string | number) {
  return authedFetch<Dashboard[]>(`/sites/${site}/dashboards`);
}

export function fetchDashboard(site: string | number, dashboardId: number) {
  return authedFetch<Dashboard>(`/sites/${site}/dashboards/${dashboardId}`);
}

export function createDashboard(site: string | number, body: { name: string; config?: DashboardConfig }) {
  return authedFetch<{ success: true; dashboardId: number }>(`/sites/${site}/dashboards`, undefined, {
    method: "POST",
    data: body,
  });
}

export function updateDashboard(
  site: string | number,
  dashboardId: number,
  body: { name?: string; config?: DashboardConfig }
) {
  return authedFetch<{ success: true }>(`/sites/${site}/dashboards/${dashboardId}`, undefined, {
    method: "PUT",
    data: body,
  });
}

export function deleteDashboard(site: string | number, dashboardId: number) {
  return authedFetch<{ success: true }>(`/sites/${site}/dashboards/${dashboardId}`, undefined, {
    method: "DELETE",
  });
}

export type RunDashboardCardBody = {
  query: string;
  bucket: TimeBucket;
} & CommonApiParams;
