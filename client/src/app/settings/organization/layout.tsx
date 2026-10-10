"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { CreateOrganizationDialog } from "../../../components/CreateOrganizationDialog";
import { Button } from "../../../components/ui/button";
import { OrgPermissionGate } from "../components/OrgPermissionGate";
import { SettingsPage, SettingsPageHeader } from "../components/Ledger";
import { useActiveOrgName } from "../../../hooks/useActiveOrgName";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const t = useExtracted();
  const orgName = useActiveOrgName();

  return (
    <SettingsPage>
      <SettingsPageHeader
        title={t("Organization")}
        description={orgName ? t("Settings and people for {name}.", { name: orgName }) : undefined}
        actions={
          <CreateOrganizationDialog
            open={createOrgDialogOpen}
            onOpenChange={setCreateOrgDialogOpen}
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                {t("New organization")}
              </Button>
            }
          />
        }
      />
      <OrgPermissionGate
        permission="members:manage"
        deniedMessage={t("You don't have permission to view organization settings.")}
      >
        {children}
      </OrgPermissionGate>
    </SettingsPage>
  );
}
