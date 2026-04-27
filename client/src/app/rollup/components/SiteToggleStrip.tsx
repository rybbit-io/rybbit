"use client";
import { GetSitesFromOrgResponse } from "@/api/admin/endpoints/sites";
import { cn } from "@/lib/utils";

type SiteRow = GetSitesFromOrgResponse["sites"][number];

export function SiteToggleStrip({
  sites,
  selectedSiteIds,
  siteColorMap,
  onSelectedSiteIdsChange,
}: {
  sites: SiteRow[];
  selectedSiteIds: number[];
  siteColorMap: Map<number, string>;
  onSelectedSiteIdsChange: (ids: number[]) => void;
}) {
  const selected = new Set(selectedSiteIds);

  const toggle = (siteId: number) => {
    if (selected.has(siteId)) {
      onSelectedSiteIdsChange(selectedSiteIds.filter((id) => id !== siteId));
    } else {
      onSelectedSiteIdsChange([...selectedSiteIds, siteId]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sites.map((site) => {
        const isSelected = selected.has(site.siteId);
        return (
          <button
            key={site.siteId}
            onClick={() => toggle(site.siteId)}
            className={cn(
              "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
              isSelected
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
            )}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-sm transition-opacity",
                isSelected ? "opacity-100" : "opacity-30"
              )}
              style={{ backgroundColor: siteColorMap.get(site.siteId) ?? "" }}
            />
            <span className="truncate max-w-[180px]">
              {site.name || site.domain}
            </span>
          </button>
        );
      })}
    </div>
  );
}
