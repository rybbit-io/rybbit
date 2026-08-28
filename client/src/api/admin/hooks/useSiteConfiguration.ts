import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteConfig, updateSiteConfig } from "../endpoints/sites";

export type UpdateSiteConfigurationInput = {
  siteId: number;
  config: SiteConfig;
};

/**
 * Refresh the shared Site summaries that project Site Configuration. Prefix
 * matching keeps string- and number-keyed Site queries consistent; dedicated
 * exclusion queries continue to refresh in their operation-specific hooks.
 */
export async function refreshSiteConfigurationSummaries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["get-site"] }),
    queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
  ]);
}

export function useUpdateSiteConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, config }: UpdateSiteConfigurationInput) => updateSiteConfig(siteId, config),
    onSuccess: () => {
      void refreshSiteConfigurationSummaries(queryClient);
    },
  });
}
