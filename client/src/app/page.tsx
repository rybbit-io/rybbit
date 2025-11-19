"use client";

import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserOrganizations } from "../api/admin/organizations";
import { useGetSitesFromOrg } from "../api/admin/sites";
import { CreateOrganizationDialog } from "../components/CreateOrganizationDialog";
import { NoOrganization } from "../components/NoOrganization";
import { OrganizationSelector } from "../components/OrganizationSelector";
import { SiteCard } from "../components/SiteCard";
import { SitesOverviewTable } from "../components/SitesOverviewTable";
import { SitesSummaryStats } from "../components/SitesSummaryStats";
import { StandardPage } from "../components/StandardPage";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardTitle } from "../components/ui/card";
import { useSetPageTitle } from "../hooks/useSetPageTitle";
import { authClient } from "../lib/auth";
import { AddSite } from "./components/AddSite";

type ViewMode = "cards" | "table";
type TimePeriod = "24h" | "7d" | "30d";

export default function Home() {
  useSetPageTitle("Rybbit · Home");

  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();

  // Load view mode and time period from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("24h");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedViewMode = localStorage.getItem("sitesViewMode") as ViewMode;
    const savedTimePeriod = localStorage.getItem("sitesTimePeriod") as TimePeriod;
    if (savedViewMode) setViewMode(savedViewMode);
    if (savedTimePeriod) setTimePeriod(savedTimePeriod);
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (isClient) {
      localStorage.setItem("sitesViewMode", mode);
    }
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    if (isClient) {
      localStorage.setItem("sitesTimePeriod", period);
    }
  };

  const {
    data: sites,
    refetch: refetchSites,
    isLoading: isLoadingSites,
  } = useGetSitesFromOrg(activeOrganization?.id, {
    includeMetrics: viewMode === "table",
    timePeriod: timePeriod,
  });

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

  // Handle successful organization creation
  const handleOrganizationCreated = () => {
    refetchOrganizations();
    refetchSites();
  };

  const timePeriodLabel = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  return (
    <StandardPage>
      <div className="flex justify-between items-center my-4">
        <div>
          <OrganizationSelector />
        </div>
        <AddSite disabled={!canAddSites} />
      </div>

      {/* Organization required message */}
      {hasNoOrganizations && <NoOrganization />}

      {/* View controls */}
      {shouldShowSites && sites?.sites && sites.sites.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center mb-4">
          {/* View mode toggle */}
          <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("cards")}
              className="gap-2"
            >
              <LayoutGrid size={16} />
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("table")}
              className="gap-2"
            >
              <Table2 size={16} />
              Table
            </Button>
          </div>

          {/* Time period selector */}
          <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
            {(["24h", "7d", "30d"] as TimePeriod[]).map(period => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTimePeriodChange(period)}
              >
                {timePeriodLabel[period]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Cards view */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites?.sites?.map(site => {
            return <SiteCard key={site.siteId} siteId={site.siteId} domain={site.domain} />;
          })}

          {/* No websites message */}
          {hasNoSites && (
            <Card className="col-span-full p-6 flex flex-col items-center text-center">
              <CardTitle className="mb-2 text-xl">No websites yet</CardTitle>
              <CardDescription className="mb-4">Add your first website to start tracking analytics</CardDescription>
              <AddSite
                trigger={
                  <Button variant="success" disabled={!canAddSites}>
                    <Plus className="h-4 w-4" />
                    Add Website
                  </Button>
                }
              />
            </Card>
          )}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div>
          {hasNoSites ? (
            <Card className="p-6 flex flex-col items-center text-center">
              <CardTitle className="mb-2 text-xl">No websites yet</CardTitle>
              <CardDescription className="mb-4">Add your first website to start tracking analytics</CardDescription>
              <AddSite
                trigger={
                  <Button variant="success" disabled={!canAddSites}>
                    <Plus className="h-4 w-4" />
                    Add Website
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <SitesSummaryStats sites={sites?.sites ?? []} isLoading={isLoadingSites} />
              <SitesOverviewTable sites={sites?.sites ?? []} isLoading={isLoadingSites} />
            </>
          )}
        </div>
      )}

      <CreateOrganizationDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </StandardPage>
  );
}
