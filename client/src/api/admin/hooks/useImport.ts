import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { ImportPlatform } from "@/types/import";
import { DEFAULT_EVENT_LIMIT } from "@/lib/subscription/constants";
import { IS_CLOUD } from "@/lib/const";
import { getSiteImports, createSiteImport, deleteSiteImport, GetSiteImportsResponse } from "../endpoints";
import { useCurrentSite } from "./useSites";

// Mirrors the server's IMPORT_TIMEOUT_MS. Only the parser's final batch completes an import, so one
// whose upload stopped early (tab closed, network lost) is abandoned after this: it stops blocking
// new imports and polling, and the server lets it be deleted.
const IMPORT_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export function isImportRunning(imp: GetSiteImportsResponse): boolean {
  if (imp.completedAt !== null) return false;
  const sql = DateTime.fromSQL(imp.startedAt, { zone: "utc" });
  const startedAt = sql.isValid ? sql : DateTime.fromISO(imp.startedAt, { zone: "utc" });
  return !startedAt.isValid || DateTime.utc().diff(startedAt).toMillis() <= IMPORT_TIMEOUT_MS;
}

export function useGetSiteImports(site: number) {
  const { subscription } = useCurrentSite();

  const isFreeTier = IS_CLOUD && subscription?.eventLimit === DEFAULT_EVENT_LIMIT;

  return useQuery({
    queryKey: ["get-site-imports", site],
    queryFn: async () => await getSiteImports(site),
    refetchInterval: data => {
      const hasActiveImports = data.state.data?.data.some(isImportRunning);
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
      return await createSiteImport(site, data);
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
      return await deleteSiteImport(site, importId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["get-site-imports", site],
      });
    },
    retry: false,
  });
}
