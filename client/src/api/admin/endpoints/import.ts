import { authedFetch } from "@/api/utils";
import { APIResponse } from "@/api/types";
import { ImportPlatform } from "@/types/import";

export interface GetSiteImportsResponse {
  importId: string;
  platform: ImportPlatform;
  importedEvents: number;
  skippedEvents: number;
  invalidEvents: number;
  startedAt: string;
  completedAt: string | null;
}

export interface CreateSiteImportResponse {
  importId: string;
  allowedDateRange: {
    earliestAllowedDate: string;
    latestAllowedDate: string;
  };
}

export function getSiteImports(siteId: number) {
  return authedFetch<APIResponse<GetSiteImportsResponse[]>>(`/sites/${siteId}/imports`);
}

export function createSiteImport(siteId: number, data: { platform: ImportPlatform }) {
  return authedFetch<APIResponse<CreateSiteImportResponse>>(`/sites/${siteId}/imports`, undefined, {
    method: "POST",
    data,
  });
}

export function deleteSiteImport(siteId: number, importId: string) {
  return authedFetch(`/sites/${siteId}/imports/${importId}`, undefined, {
    method: "DELETE",
  });
}
