"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";

interface SiteAccessMultiSelectProps {
  selectedSiteIds: number[];
  onChange: (siteIds: number[]) => void;
  disabled?: boolean;
}

export function SiteAccessMultiSelect({ selectedSiteIds, onChange, disabled = false }: SiteAccessMultiSelectProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sitesData, isLoading } = useGetSitesFromOrg(activeOrganization?.id);

  const sites = sitesData?.sites || [];

  const handleToggle = (siteId: number) => {
    if (selectedSiteIds.includes(siteId)) {
      onChange(selectedSiteIds.filter(id => id !== siteId));
    } else {
      onChange([...selectedSiteIds, siteId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSiteIds.length === sites.length) {
      onChange([]);
    } else {
      onChange(sites.map(s => s.siteId));
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading sites...</div>;
  }

  if (sites.length === 0) {
    return <div className="text-sm text-muted-foreground">No sites in this organization</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all"
          checked={selectedSiteIds.length === sites.length}
          onCheckedChange={handleSelectAll}
          disabled={disabled}
        />
        <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
          Select all sites ({sites.length})
        </Label>
      </div>
      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
        {sites.map(site => (
          <div key={site.siteId} className="flex items-center space-x-3 p-2.5 hover:bg-muted/50">
            <Checkbox
              id={`site-${site.siteId}`}
              checked={selectedSiteIds.includes(site.siteId)}
              onCheckedChange={() => handleToggle(site.siteId)}
              disabled={disabled}
            />
            <Label htmlFor={`site-${site.siteId}`} className="flex-1 cursor-pointer text-sm">
              <span className="font-medium">{site.name}</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
