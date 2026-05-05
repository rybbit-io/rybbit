"use client";
import { useWindowSize } from "@uidotdev/usehooks";
import { useExtracted } from "next-intl";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useTeams } from "@/api/admin/hooks/useTeams";
import { AppSidebar } from "@/components/AppSidebar";
import { NavigationSidebar } from "@/components/sidebar/NavigationSidebar";
import { StandardPage } from "@/components/StandardPage";
import { Card } from "@/components/ui/card";
import { useInView } from "@/hooks/useInView";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { buildSiteColorMap } from "./components/MainSection/Chart";
import { MainSection } from "./components/MainSection/MainSection";
import { RollupTopBar } from "./components/RollupTopBar";
import { SiteToggleStrip } from "./components/SiteToggleStrip";
import { Countries } from "./components/sections/Countries";
import { Devices } from "./components/sections/Devices";
import { Referrers } from "./components/sections/Referrers";

function LazySection({
  children,
  height = "405px",
}: {
  children: ReactNode;
  height?: string;
}) {
  const { ref, isInView } = useInView({
    persistVisibility: true,
    rootMargin: "100px 0px",
  });
  return (
    <div ref={ref} style={{ minHeight: isInView ? undefined : height }}>
      {isInView ? children : null}
    </div>
  );
}

export default function RollupPage() {
  const t = useExtracted();
  useSetPageTitle("Rollup");
  const { width } = useWindowSize();
  const isDesktop = width !== null && width >= 768;

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sitesData } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: teamsData } = useTeams(activeOrganization?.id);
  useUserOrganizations(); // ensure org list is loaded for header consistency

  const allSites = useMemo(() => sitesData?.sites ?? [], [sitesData]);
  const teams = teamsData?.teams || [];

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[] | null>(null);

  const filteredSites = useMemo(() => {
    return allSites.filter((site) => {
      if (selectedTeamFilter === "all") return true;
      if (selectedTeamFilter === "unassigned") {
        return !site.teams || site.teams.length === 0;
      }
      return (
        site.teams?.some((team) => team.id === selectedTeamFilter) || false
      );
    });
  }, [allSites, selectedTeamFilter]);

  // Default selected sites = all filtered sites (until user picks explicitly).
  // When the team filter narrows the list, prune the explicit selection too.
  useEffect(() => {
    if (selectedSiteIds === null) return;
    const allowed = new Set(filteredSites.map((s) => s.siteId));
    const pruned = selectedSiteIds.filter((id) => allowed.has(id));
    if (pruned.length !== selectedSiteIds.length) {
      setSelectedSiteIds(pruned);
    }
  }, [filteredSites, selectedSiteIds]);

  const effectiveSiteIds =
    selectedSiteIds ?? filteredSites.map((s) => s.siteId);

  // Color assignment is by position in filteredSites so no two sites in view
  // collide as long as count <= palette size.
  const siteColorMap = useMemo(
    () => buildSiteColorMap(filteredSites.map((s) => s.siteId)),
    [filteredSites]
  );

  const content = (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <RollupTopBar
        teams={teams}
        selectedTeamFilter={selectedTeamFilter}
        onSelectedTeamFilterChange={setSelectedTeamFilter}
      />
      <SiteToggleStrip
        sites={filteredSites}
        selectedSiteIds={effectiveSiteIds}
        siteColorMap={siteColorMap}
        onSelectedSiteIdsChange={setSelectedSiteIds}
      />
      {effectiveSiteIds.length === 0 ? (
        <Card className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t("Select at least one site to view rollup analytics.")}
        </Card>
      ) : (
        <>
          <MainSection
            siteIds={effectiveSiteIds}
            sites={filteredSites}
            siteColorMap={siteColorMap}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            <LazySection>
              <Referrers siteIds={effectiveSiteIds} />
            </LazySection>
            <LazySection>
              <Devices siteIds={effectiveSiteIds} />
            </LazySection>
            <LazySection>
              <Countries siteIds={effectiveSiteIds} />
            </LazySection>
          </div>
        </>
      )}
    </div>
  );

  if (!isDesktop) {
    return <StandardPage>{content}</StandardPage>;
  }

  return (
    <div className="flex h-full">
      <AppSidebar />
      <NavigationSidebar />
      <StandardPage showSidebar={false}>{content}</StandardPage>
    </div>
  );
}
