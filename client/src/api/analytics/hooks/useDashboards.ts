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
    // Write the edit into the cache before the round trip. Without this the
    // editor drops its working copy on save and falls back to the cached
    // dashboard, which is still the pre-save version until the refetch lands.
    onMutate: async ({ siteId, dashboardId, name, config }) => {
      const detailKey = ["get-dashboard", siteId, dashboardId];
      const listKey = ["get-dashboards", siteId];
      // In-flight refetches would otherwise resolve over the optimistic value.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);

      const previousDetail = queryClient.getQueryData<Dashboard>(detailKey);
      const previousList = queryClient.getQueryData<Dashboard[]>(listKey);
      const applyEdit = (dashboard: Dashboard): Dashboard => ({
        ...dashboard,
        name: name ?? dashboard.name,
        config: config ?? dashboard.config,
        updatedAt: new Date().toISOString(),
      });

      if (previousDetail) {
        queryClient.setQueryData<Dashboard>(detailKey, applyEdit(previousDetail));
      }
      if (previousList) {
        queryClient.setQueryData<Dashboard[]>(
          listKey,
          previousList.map(dashboard => (dashboard.dashboardId === dashboardId ? applyEdit(dashboard) : dashboard))
        );
      }

      return { detailKey, listKey, previousDetail, previousList };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      if (context.previousList) {
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },
    onSettled: (_data, _error, variables) => {
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
