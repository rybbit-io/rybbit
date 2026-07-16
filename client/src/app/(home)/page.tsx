"use client";

import { useWindowSize } from "@uidotdev/usehooks";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useUserOrganizations } from "../../api/admin/hooks/useOrganizations";
import { useGetSitesFromOrg } from "../../api/admin/hooks/useSites";
import { useTeams } from "../../api/admin/hooks/useTeams";
import { AppSidebar } from "../../components/AppSidebar";
import { CreateOrganizationDialog } from "../../components/CreateOrganizationDialog";
import { DateSelector } from "../../components/DateSelector/DateSelector";
import { NoOrganization } from "../../components/NoOrganization";
import { OrganizationSelector } from "../../components/OrganizationSelector";
import { NavigationSidebar } from "../../components/sidebar/NavigationSidebar";
import { StandardPage } from "../../components/StandardPage";
import { TeamSelector } from "../../components/TeamSelector";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { MultiSelect } from "../../components/ui/multi-select";
import { Pagination } from "../../components/pagination";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { canGoForward, goBack, goForward, useStore } from "../../lib/store";
import { AddSite } from "../components/AddSite";
import { SiteCard } from "./SiteCard";

// Only render a bounded slice of site cards at a time. Each card mounts an
// IntersectionObserver and fires its own analytics queries, so rendering every
// site at once crashes orgs with thousands of websites.
const PAGE_SIZE = 20;

export default function Home() {
  const t = useExtracted();
  useSetPageTitle("Home");

  const { width } = useWindowSize();
  const isDesktop = width !== null && width >= 768;

  const { time, setTime } = useStore();
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();

  const { data: sites, refetch: refetchSites, isLoading: isLoadingSites } = useGetSitesFromOrg(activeOrganization?.id);

  const {
    data: userOrganizationsData,
    isLoading: isLoadingOrganizations,
    refetch: refetchOrganizations,
  } = useUserOrganizations();

  // Consolidated loading state
  const isLoading = isLoadingOrganizations || isPending || isLoadingSites;

  // Check if user has organizations
  const hasOrganizations = Array.isArray(userOrganizationsData) && userOrganizationsData.length > 0;
  const hasNoOrganizations = !isLoading && !hasOrganizations;

  // Check user permissions for the active organization
  const activeOrgMembership = userOrganizationsData?.find(org => org.id === activeOrganization?.id);

  const isUserMember = activeOrgMembership?.role === "member";
  const canAddSites = hasOrganizations && !isUserMember;

  // Check if we should show sites content
  const shouldShowSites = hasOrganizations && !isLoading;
  const hasNoSites = shouldShowSites && (!sites?.sites || sites.sites.length === 0);

  const { data: teamsData } = useTeams(activeOrganization?.id);

  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Filters run over the full org list, so changing them should jump back to
  // the first page of results.
  useEffect(() => {
    setPage(1);
  }, [nameFilter, selectedTags, selectedTeamFilter]);

  // Compute unique tags from all sites
  const allTags = useMemo(() => {
    const tags = sites?.sites?.flatMap(s => s.tags || []) || [];
    return Array.from(new Set(tags)).toSorted();
  }, [sites?.sites]);

  // Track hydration to avoid mismatch with date-dependent disabled states
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const teams = teamsData?.teams || [];

  // Filter sites by name, tags, and team
  const filteredSites = sites?.sites?.filter(site => {
    const matchesDomain = site.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => site.tags?.includes(tag));
    let matchesTeam = true;
    if (selectedTeamFilter === "unassigned") {
      matchesTeam = !site.teams || site.teams.length === 0;
    } else if (selectedTeamFilter !== "all") {
      matchesTeam = site.teams?.some(t => t.id === selectedTeamFilter) || false;
    }
    return matchesDomain && matchesTags && matchesTeam;
  });

  // Paginate the filtered list so only PAGE_SIZE cards mount at once. safePage
  // clamps the current page when filtering shrinks the result set below it.
  const totalFiltered = filteredSites?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSites = filteredSites?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasNoMatches = totalFiltered === 0;

  // Handle successful organization creation
  const handleOrganizationCreated = () => {
    refetchOrganizations();
    refetchSites();
  };

  // Handle tag click to toggle filter
  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const hasSites = shouldShowSites && sites?.sites && sites.sites.length > 0;

  const teamSelector = (
    <TeamSelector
      teams={teams}
      value={selectedTeamFilter}
      onValueChange={setSelectedTeamFilter}
      canCreateTeam={!isUserMember && hasOrganizations}
    />
  );

  const dateControls = (
    <div className="flex items-center gap-2">
      <DateSelector time={time} setTime={setTime} />
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="icon"
          onClick={goBack}
          disabled={time.mode === "past-minutes"}
          className="rounded-r-none h-8 w-8"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={goForward}
          disabled={!isMounted || !canGoForward(time)}
          className="rounded-l-none -ml-px h-8 w-8"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );

  const filterBar = hasSites ? (
    <div className="flex gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          placeholder={t("Filter by name...")}
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          className="pl-9"
        />
      </div>
      {!isDesktop && teamSelector}
      {allTags.length > 0 && (
        <div className="w-[200px]">
          <MultiSelect
            options={allTags.map(tag => ({ value: tag, label: tag }))}
            value={selectedTags}
            onValueChange={setSelectedTags}
            placeholder={t("Filter by tags...")}
            searchPlaceholder={t("Search tags...")}
            emptyText={t("No tags found.")}
            className="border-neutral-150 dark:border-neutral-800"
          />
        </div>
      )}
      <div className="hidden md:block">
        <AddSite disabled={!canAddSites} />
      </div>
    </div>
  ) : null;

  const siteCards = (
    <div className="flex flex-col gap-2">
      {paginatedSites?.map(site => {
        return (
          <SiteCard
            key={site.siteId}
            siteId={site.siteId}
            name={site.name}
            domain={site.domain}
            tags={site.tags || []}
            allTags={allTags}
            onTagsUpdated={refetchSites}
            selectedTags={selectedTags}
            onTagClick={handleTagClick}
          />
        );
      })}
      {hasSites && hasNoMatches ? (
        <Card className="p-6 flex flex-col items-center text-center">
          <CardTitle className="mb-2 text-xl">{t("No matching websites")}</CardTitle>
          <CardDescription>{t("Try adjusting your filters")}</CardDescription>
        </Card>
      ) : null}
      {hasNoSites ? (
        <Card className="p-6 flex flex-col items-center text-center">
          <CardTitle className="mb-2 text-xl">{t("No websites yet")}</CardTitle>
          <CardDescription className="mb-4">{t("Add your first website to start tracking analytics")}</CardDescription>
          <AddSite
            trigger={
              <Button variant="success" disabled={!canAddSites}>
                <Plus className="h-4 w-4" />
                {t("Add Website")}
              </Button>
            }
          />
        </Card>
      ) : null}
    </div>
  );

  const pagination =
    hasSites && totalPages > 1 ? (
      <div className="mt-4">
        <Pagination
          page={safePage}
          pageCount={totalPages}
          totalItems={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName={t("websites")}
        />
      </div>
    ) : null;

  const content = (
    <>
      {hasNoOrganizations && <NoOrganization />}
      {filterBar}
      {siteCards}
      {pagination}
      <CreateOrganizationDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </>
  );

  if (!isDesktop) {
    return (
      <StandardPage>
        <div className="flex justify-between items-center my-4">
          <div>
            <OrganizationSelector />
          </div>
          {dateControls}
        </div>
        {content}
      </StandardPage>
    );
  }

  return (
    <div className="flex h-full">
      <AppSidebar />
      <NavigationSidebar />
      <StandardPage showSidebar={false}>
        <div className="flex justify-between items-center my-4">
          <div>{teamSelector}</div>
          {dateControls}
        </div>
        {content}
      </StandardPage>
    </div>
  );
}
