import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "@/api/utils";
import { APIResponse } from "@/api/types";
import { ImportPlatform } from "@/types/import";
import { useCurrentSite } from "./sites";
import { DEFAULT_EVENT_LIMIT } from "@/lib/subscription/constants";
import { IS_CLOUD } from "@/lib/const";

interface GetSiteImportsResponse {
  importId: string;
  platform: ImportPlatform;
  importedEvents: number;
  skippedEvents: number;
  invalidEvents: number;
  startedAt: string;
  completedAt: string | null;
}

interface CreateSiteImportResponse {
  importId: string;
  allowedDateRange: {
    earliestAllowedDate: string;
    latestAllowedDate: string;
  };
}

export function useGetSiteImports(site: number) {
  const { subscription } = useCurrentSite();

  const isFreeTier = IS_CLOUD && subscription?.eventLimit === DEFAULT_EVENT_LIMIT;

  return useQuery({
    queryKey: ["get-site-imports", site],
    queryFn: async () => await authedFetch<APIResponse<GetSiteImportsResponse[]>>(`/sites/${site}/imports`),
    refetchInterval: data => {
      const hasActiveImports = data.state.data?.data.some(imp => imp.completedAt === null);
      return hasActiveImports ? 5000 : false;
    },
    placeholderData: { data: [] },
    staleTime: 30000,
    enabled: !isFreeTier,
  });
}

export function useCreateSiteImport(site: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ImportPlatform }) => {
      return await authedFetch<APIResponse<CreateSiteImportResponse>>(`/sites/${site}/imports`, undefined, {
        method: "POST",
        data,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["get-site-imports", site],
      });
    },
    retry: false,
  });
}

export function useDeleteSiteImport(site: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      return await authedFetch(`/sites/${site}/imports/${importId}`, undefined, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["get-site-imports", site],
      });
    },
    retry: false,
  });
}
