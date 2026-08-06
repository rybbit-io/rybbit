import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { FUNNEL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import {
  analyzeFunnel,
  AnalyzeFunnelParams,
  FunnelRequest,
  FunnelResponse,
  saveFunnel,
  SaveFunnelRequest,
} from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

/**
 * Hook for analyzing conversion funnels through a series of steps
 */
export function useGetFunnel(config?: FunnelRequest, debounce?: boolean) {
  const debouncedConfig = useDebounce(config, 500);
  const configToUse = debounce ? debouncedConfig : config;
  // Only the funnel page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(FUNNEL_PAGE_FILTERS);

  return useAnalyticsQuery<FunnelResponse[], AnalyzeFunnelParams>({
    key: "funnel",
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { steps: configToUse?.steps ?? [], name: configToUse?.name },
    enabled: !!configToUse,
    fetch: (site, params) => analyzeFunnel(site, params),
  });
}

/**
 * Hook for saving funnel configurations without analyzing them
 */
export function useSaveFunnel() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; funnelId: number }, Error, SaveFunnelRequest>({
    mutationFn: async funnelConfig => {
      try {
        const saveResponse = await saveFunnel(site, {
          steps: funnelConfig.steps,
          name: funnelConfig.name,
          reportId: funnelConfig.reportId,
        });

        // Invalidate the funnels query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["funnels", site] });

        return saveResponse;
      } catch (error) {
        throw new Error("Failed to save funnel");
      }
    },
  });
}
