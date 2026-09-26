"use client";
import { useWindowSize } from "@uidotdev/usehooks";
import { useExtracted } from "next-intl";
import { memo, ReactNode, useDeferredValue, useMemo, useState } from "react";
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
import { LITE_DASHBOARD } from "@/lib/const";
import { buildSiteColorMap } from "./components/MainSection/Chart";
import { MainSection } from "./components/MainSection/MainSection";
import { RollupFilterChips } from "./components/RollupFilters";
import { RollupTopBar } from "./components/RollupTopBar";
import { SiteToggleStrip } from "./components/SiteToggleStrip";
import { Countries } from "./components/sections/Countries";
import { CountriesLite } from "./components/sections/CountriesLite";
import { Devices } from "./components/sections/Devices";
import { PagesLite } from "./components/sections/PagesLite";
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

type SiteRow = NonNullable<ReturnType<typeof useGetSitesFromOrg>["data"]>["sites"][number];

// Everything below the site strip. Memoised and fed a deferred site list so a
// chip toggle repaints the chip immediately and the charts catch up after.
const RollupContent = memo(function RollupContent({
  siteIds,
  sites,
  siteColorMap,
}: {
  siteIds: number[];
  sites: SiteRow[];
  siteColorMap: Map<number, string>;
}) {
  const t = useExtracted();

  if (siteIds.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {t("Select at least one site to view rollup analytics.")}
      </Card>
    );
  }

  if (LITE_DASHBOARD) {
    return (
      <>
        <MainSection siteIds={siteIds} sites={sites} siteColorMap={siteColorMap} lite />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          <LazySection>
            <PagesLite siteIds={siteIds} />
          </LazySection>
          <LazySection>
            <CountriesLite siteIds={siteIds} />
          </LazySection>
        </div>
      </>
    );
  }

  return (
    <>
      <MainSection siteIds={siteIds} sites={sites} siteColorMap={siteColorMap} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <LazySection>
          <Referrers siteIds={siteIds} />
        </LazySection>
        <LazySection>
          <Devices siteIds={siteIds} />
        </LazySection>
        <LazySection>
          <Countries siteIds={siteIds} />
        </LazySection>
      </div>
    </>
  );
});

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // Track what the user switched OFF rather than on: narrowing by team or tag
  // then shows every site in the new set, and widening again brings back
  // exactly what they had.
  const [hiddenSiteIds, setHiddenSiteIds] = useState<Set<number>>(new Set());

  const allTags = useMemo(
    () => Array.from(new Set(allSites.flatMap((s) => s.tags ?? []))).toSorted(),
    [allSites]
  );

  const filteredSites = useMemo(() => {
    return allSites.filter((site) => {
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => site.tags?.includes(tag));
      if (!matchesTags) return false;
      if (selectedTeamFilter === "all") return true;
      if (selectedTeamFilter === "unassigned") {
        return !site.teams || site.teams.length === 0;
      }
      return (
        site.teams?.some((team) => team.id === selectedTeamFilter) || false
      );
    });
  }, [allSites, selectedTeamFilter, selectedTags]);

  const selectedSiteIds = useMemo(
    () =>
      filteredSites
        .filter((s) => !hiddenSiteIds.has(s.siteId))
        .map((s) => s.siteId),
    [filteredSites, hiddenSiteIds]
  );
  const deferredSiteIds = useDeferredValue(selectedSiteIds);

  const setSelectedSiteIds = (ids: number[]) => {
    const selected = new Set(ids);
    const next = new Set(hiddenSiteIds);
    for (const site of filteredSites) {
      if (selected.has(site.siteId)) next.delete(site.siteId);
      else next.add(site.siteId);
    }
    setHiddenSiteIds(next);
  };

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
        allTags={allTags}
        selectedTags={selectedTags}
        onSelectedTagsChange={setSelectedTags}
        filterSiteIds={LITE_DASHBOARD ? undefined : deferredSiteIds}
      />
      {!LITE_DASHBOARD && <RollupFilterChips siteIds={deferredSiteIds} />}
      <SiteToggleStrip
        sites={filteredSites}
        selectedSiteIds={selectedSiteIds}
        siteColorMap={siteColorMap}
        onSelectedSiteIdsChange={setSelectedSiteIds}
      />
      <RollupContent
        siteIds={deferredSiteIds}
        sites={filteredSites}
        siteColorMap={siteColorMap}
      />
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
