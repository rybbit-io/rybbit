"use client";
import { GetSitesFromOrgResponse } from "@/api/admin/endpoints/sites";
import { ToggleChip } from "@/components/ToggleChip";

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
      {sites.map((site) => (
        <ToggleChip
          key={site.siteId}
          isSelected={selected.has(site.siteId)}
          onClick={() => toggle(site.siteId)}
          swatchColor={siteColorMap.get(site.siteId) ?? ""}
          label={
            <span className="truncate max-w-[180px]">
              {site.name || site.domain}
            </span>
          }
        />
      ))}
    </div>
  );
}
