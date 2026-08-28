"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../components/ui/button";
import { useOrganizationAccess } from "../../../hooks/useOrganizationAccess";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";
import { ExternalLink } from "../../../components/ExternalLink";
import { OrganizationAccessGate } from "../components/OrganizationAccessGate";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const access = useOrganizationAccess();

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Teams")}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            {t("Organize sites into teams to control which members can access them.")}
            <ExternalLink href="https://www.rybbit.com/docs/teams">{t("Learn more about teams")}</ExternalLink>
          </p>
        </div>
        {access.decisions.manageTeams.allowed && (
          <CreateEditTeamDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("Create Team")}
              </Button>
            }
          />
        )}
      </div>

      <OrganizationAccessGate
        decision={access.decisions.manageTeams}
        deniedMessage={t("You don't have permission to view team settings.")}
        errorMessage={t("Failed to load organizations data. Please try again later.")}
        loadingMessage={t("Loading organization...")}
        noOrganizationMessage={t("You need to create or be added to an organization before you can manage teams.")}
        onRetry={access.retry}
        retryLabel={t("Try Again")}
      >
        <div className="mt-6">{children}</div>
      </OrganizationAccessGate>
    </div>
  );
}
