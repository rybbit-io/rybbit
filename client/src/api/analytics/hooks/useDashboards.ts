import type { Dashboard, DashboardConfig } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDashboard,
  deleteDashboard,
  fetchDashboard,
  fetchDashboards,
  updateDashboard,
} from "../endpoints/dashboards";

export function useGetDashboards(siteId?: string | number) {
  return useQuery<Dashboard[]>({
    queryKey: ["get-dashboards", siteId],
    queryFn: () => fetchDashboards(siteId!),
    enabled: !!siteId,
  });
}

export function useGetDashboard(siteId?: string | number, dashboardId?: number) {
  return useQuery<Dashboard>({
    queryKey: ["get-dashboard", siteId, dashboardId],
    queryFn: () => fetchDashboard(siteId!, dashboardId!),
    enabled: !!siteId && !!dashboardId,
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, name, config }: { siteId: string | number; name: string; config?: DashboardConfig }) =>
      createDashboard(siteId, { name, config }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["get-dashboards", variables.siteId] });
    },
  });
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      siteId,
      dashboardId,
      name,
      config,
    }: {
      siteId: string | number;
      dashboardId: number;
      name?: string;
      config?: DashboardConfig;
    }) => updateDashboard(siteId, dashboardId, { name, config }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["get-dashboards", variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ["get-dashboard", variables.siteId, variables.dashboardId] });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, dashboardId }: { siteId: string | number; dashboardId: number }) =>
      deleteDashboard(siteId, dashboardId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: ["get-dashboard", variables.siteId, variables.dashboardId], exact: true });
      queryClient.invalidateQueries({ queryKey: ["get-dashboards", variables.siteId] });
    },
  });
}
