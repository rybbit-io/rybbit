"use client";

import { Users2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";

import { Team } from "@/api/admin/endpoints/teams";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useTeams } from "@/api/admin/hooks/useTeams";
import { NoOrganization } from "@/components/NoOrganization";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LedgerRows, LedgerSection } from "../components/Ledger";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";
import { accessBySite } from "../components/siteAccess";
import { SiteAccessList } from "./components/SiteAccessList";
import { TeamsTable } from "./components/TeamsTable";

const MUTED = "text-neutral-500 dark:text-neutral-400";
const RULE = "border-neutral-100 dark:border-neutral-850";

export default function TeamsPage() {
  useSetPageTitle("Organization Teams");
  const t = useExtracted();
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();
  const organizationId = activeOrganization?.id;
  const { data: teamsData, isLoading: teamsLoading, isError: teamsError } = useTeams(organizationId);
  const { data: membersData, isError: membersError } = useOrganizationMembers(organizationId);
  const { data: sitesData, isError: sitesError } = useGetSitesFromOrg(organizationId);

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const teams = teamsData?.teams;
  const members = membersData?.data;
  const sites = sitesData?.sites;
  const access = useMemo(
    () => (teams && members && sites ? accessBySite(sites, members, teams) : undefined),
    [teams, members, sites]
  );

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">{t("Loading organization...")}</div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <NoOrganization message={t("You need to create or be added to an organization before you can manage teams.")} />
    );
  }

  return (
    <>
      <LedgerSection title={t("Teams")} count={teams?.length}>
        {teamsLoading ? (
          <LedgerRows>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex h-[52px] items-center gap-10">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}
          </LedgerRows>
        ) : !teams?.length ? (
          <div className={cn("border-y py-10 text-center", RULE)}>
            <Users2 aria-hidden="true" className={cn("mx-auto mb-3 size-8", MUTED)} />
            <p className="font-medium">{t("No teams yet")}</p>
            <p className={cn("mt-1 text-sm", MUTED)}>{t("Create a team to group sites and manage member access.")}</p>
          </div>
        ) : (
          <TeamsTable teams={teams} access={access} members={members} onEdit={setEditingTeam} />
        )}
      </LedgerSection>

      {(!sites || sites.length > 0) && (
        <LedgerSection
          title={t("Access by site")}
          description={t("Who can open each site, with what role, and why. Owners and admins always reach every site.")}
        >
          {access ? (
            <SiteAccessList access={access} onEditTeam={setEditingTeam} />
          ) : teamsError || membersError || sitesError ? (
            <p className={cn("border-y py-4 text-sm", RULE, MUTED)}>{t("Couldn't load who can open each site.")}</p>
          ) : (
            <LedgerRows>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid gap-x-10 gap-y-2 py-4 md:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="space-y-2 md:pt-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="space-y-2 md:pt-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
              ))}
            </LedgerRows>
          )}
        </LedgerSection>
      )}

      <CreateEditTeamDialog
        team={editingTeam || undefined}
        open={!!editingTeam}
        onOpenChange={open => {
          if (!open) setEditingTeam(null);
        }}
      />
    </>
  );
}
