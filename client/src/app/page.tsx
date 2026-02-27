"use client";

import { useExtracted } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";
import { useGetSitesFromOrg } from "../api/admin/hooks/useSites";
import { CreateOrganizationDialog } from "../components/CreateOrganizationDialog";
import { DateSelector } from "../components/DateSelector/DateSelector";
import { NoOrganization } from "../components/NoOrganization";
import { OrganizationSelector } from "../components/OrganizationSelector";
import { SiteCard } from "../components/SiteCard";
import { StandardPage } from "../components/StandardPage";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { MultiSelect } from "../components/ui/multi-select";
import { useSetPageTitle } from "../hooks/useSetPageTitle";
import { authClient } from "../lib/auth";
import { canGoForward, goBack, goForward, useStore } from "../lib/store";
import { AddSite } from "./components/AddSite";

export default function Home() {
  const t = useExtracted();
  useSetPageTitle("Home");

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

  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [domainFilter, setDomainFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Compute unique tags from all sites
  const allTags = useMemo(() => {
    const tags = sites?.sites?.flatMap(s => s.tags || []) || [];
    return [...new Set(tags)].sort();
  }, [sites?.sites]);

  // Track hydration to avoid mismatch with date-dependent disabled states
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Filter sites by domain and tags
  const filteredSites = sites?.sites?.filter(site => {
    const matchesDomain = site.domain.toLowerCase().includes(domainFilter.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => site.tags?.includes(tag));
    return matchesDomain && matchesTags;
  });

  // Handle successful organization creation
  const handleOrganizationCreated = () => {
    refetchOrganizations();
    refetchSites();
  };

  // Handle tag click to toggle filter
  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <StandardPage>
      <div className="flex justify-between items-center my-4">
        <div>
          <OrganizationSelector />
        </div>
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
      </div>
      {hasNoOrganizations && <NoOrganization />}
      {shouldShowSites && sites?.sites && sites.sites.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder={t("Filter by domain...")}
              value={domainFilter}
              onChange={e => setDomainFilter(e.target.value)}
              className="pl-9"
            />
          </div>
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
      )}
      <div className="flex flex-col gap-2">
        {filteredSites?.map(site => {
          return (
            <SiteCard
              key={site.siteId}
              siteId={site.siteId}
              domain={site.domain}
              tags={site.tags || []}
              allTags={allTags}
              onTagsUpdated={refetchSites}
              selectedTags={selectedTags}
              onTagClick={handleTagClick}
            />
          );
        })}
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
      <CreateOrganizationDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </StandardPage>
  );
}
