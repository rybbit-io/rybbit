"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { ExternalLink } from "../../../components/ExternalLink";
import { Button } from "../../../components/ui/button";
import { useOrgPermissions } from "../../../hooks/usePermissions";
import { authClient } from "../../../lib/auth";
import { OrgPermissionGate } from "../components/OrgPermissionGate";
import { SettingsPage, SettingsPageHeader } from "../components/Ledger";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const { can } = useOrgPermissions();

  return (
    <SettingsPage>
      <SettingsPageHeader
        title={t("Teams")}
        description={
          <>
            {t("A team gives its people a set of sites, and can raise their role on those sites.")}{" "}
            <ExternalLink href="https://www.rybbit.com/docs/teams">{t("How access works")}</ExternalLink>
          </>
        }
        actions={
          session?.session.activeOrganizationId &&
          can("teams:manage") && (
            <CreateEditTeamDialog
              trigger={
                <Button variant="success" size="sm">
                  <Plus />
                  {t("Create team")}
                </Button>
              }
            />
          )
        }
      />
      <OrgPermissionGate
        permission="teams:manage"
        deniedMessage={t("You don't have permission to view team settings.")}
      >
        {children}
      </OrgPermissionGate>
    </SettingsPage>
  );
}
