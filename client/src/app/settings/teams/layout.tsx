"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../components/ui/button";
import { useOrgPermissions } from "../../../hooks/usePermissions";
import { authClient } from "../../../lib/auth";
import { OrgPermissionGate } from "../components/OrgPermissionGate";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";
import { ExternalLink } from "../../../components/ExternalLink";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { can } = useOrgPermissions();

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Teams")}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            {t("Organize sites into teams to control which members can access them.")}
            <ExternalLink href="https://www.rybbit.com/docs/teams">
              {t("Learn more about teams")}
            </ExternalLink>
          </p>
        </div>
        {activeOrg?.id && can("teams:manage") && (
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

      <OrgPermissionGate
        permission="teams:manage"
        deniedMessage={t("You don't have permission to view team settings.")}
      >
        <div className="mt-6">{children}</div>
      </OrgPermissionGate>
    </div>
  );
}
