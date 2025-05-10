"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useUserOrganizations } from "../api/admin/organizations";
import { useGetSites } from "../api/admin/sites";
import { NoOrganization } from "../components/NoOrganization";
import { SiteCard } from "../components/SiteCard";
import { StandardPage } from "../components/StandardPage";
import { Button } from "../components/ui/button";
import { Card, CardDescription, CardTitle } from "../components/ui/card";
import { AddSite } from "./components/AddSite";
import { CreateOrganizationDialog } from "../components/CreateOrganizationDialog";
import { FreeTrialBanner } from "../components/FreeTrialBanner";
import { useSetPageTitle } from "../hooks/useSetPageTitle";
import { OrganizationSelector } from "./components/OrganizationSelector";

export default function Home() {
  useSetPageTitle("Rybbit · Home");

  const {
    data: sites,
    refetch: refetchSites,
    isLoading: isLoadingSites,
  } = useGetSites();
  const {
    data: userOrganizationsData,
    isLoading: isLoadingOrganizations,
    refetch: refetchOrganizations,
  } = useUserOrganizations();

  const disabled =
    !userOrganizationsData?.[0] || userOrganizationsData?.[0].role === "member";

  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  // Check if the user has no organizations and is not in a loading state
  const hasNoOrganizations =
    !isLoadingOrganizations &&
    Array.isArray(userOrganizationsData) &&
    userOrganizationsData.length === 0;

  // Handle successful organization creation
  const handleOrganizationCreated = () => {
    refetchOrganizations();
    refetchSites();
  };

  // Organization filtering
  const [filterOrganizationId, setFilterOrganizationId] = useState<string>();

  return (
    <StandardPage>
      <FreeTrialBanner />
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl font-bold">Websites</div>
        <div className="flex items-center gap-2">
          <OrganizationSelector
            filterOrganizationId={filterOrganizationId}
            setFilterOrganizationId={setFilterOrganizationId}
          />
          <AddSite disabled={hasNoOrganizations || disabled} />
        </div>
      </div>
      {/* Organization required message */}
      {hasNoOrganizations && <NoOrganization />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sites list */}

        {sites
          ?.filter((site) =>
            filterOrganizationId === undefined
              ? true
              : site.organizationId === filterOrganizationId
          )
          .map((site) => {
            return (
              <SiteCard
                key={site.siteId}
                siteId={site.siteId}
                domain={site.domain}
              />
            );
          })}

        {/* No websites message */}
        {!hasNoOrganizations &&
          (!sites || sites.length === 0) &&
          !isLoadingOrganizations &&
          !isLoadingSites && (
            <Card className="col-span-full p-6 flex flex-col items-center text-center">
              <CardTitle className="mb-2 text-xl">No websites yet</CardTitle>
              <CardDescription className="mb-4">
                Add your first website to start tracking analytics
              </CardDescription>
              <AddSite
                trigger={
                  <Button
                    variant="success"
                    disabled={
                      !userOrganizationsData?.[0] ||
                      userOrganizationsData?.[0].role === "member"
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Website
                  </Button>
                }
              />
            </Card>
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
