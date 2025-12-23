"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useUserOrganizations } from "../api/admin/organizations";
import { useGetSitesFromOrg } from "../api/admin/sites";
import { CreateOrganizationDialog } from "../components/CreateOrganizationDialog";
import { DateSelector } from "../components/DateSelector/DateSelector";
import { NoOrganization } from "../components/NoOrganization";
import { OrganizationSelector } from "../components/OrganizationSelector";
import { SiteCard } from "../components/SiteCard";
import { StandardPage } from "../components/StandardPage";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardTitle } from "../components/ui/card";
import { useSetPageTitle } from "../hooks/useSetPageTitle";
import { authClient } from "../lib/auth";
import { canGoForward, goBack, goForward, useStore } from "../lib/store";
import { AddSite } from "./components/AddSite";

export default function Home() {
  useSetPageTitle("Rybbit · Home");

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

  // Handle successful organization creation
  const handleOrganizationCreated = () => {
    refetchOrganizations();
    refetchSites();
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
              disabled={!canGoForward(time)}
              className="rounded-l-none -ml-px h-8 w-8"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      {hasNoOrganizations && <NoOrganization />}
      <div className="flex flex-col gap-4">
        {sites?.sites?.map(site => {
          return <SiteCard key={site.siteId} siteId={site.siteId} domain={site.domain} />;
        })}
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
          <div className="flex justify-center">
            <AddSite disabled={!canAddSites} />
          </div>
        )}
      </div>
      <CreateOrganizationDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </StandardPage>
  );
}
