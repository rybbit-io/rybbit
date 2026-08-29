"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { CreateOrganizationDialog } from "../../../components/CreateOrganizationDialog";
import { OrganizationSelector } from "../../../components/OrganizationSelector";
import { Button } from "../../../components/ui/button";
import { useOrganizationAccess } from "../../../hooks/useOrganizationAccess";
import { OrganizationAccessGate } from "../components/OrganizationAccessGate";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  const t = useExtracted();
  const access = useOrganizationAccess();

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Organization Settings")}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t("Manage your organization settings and members")}</p>
        </div>

        <div className="flex items-center gap-2">
          <OrganizationSelector />
          <CreateOrganizationDialog
            open={createOrgDialogOpen}
            onOpenChange={setCreateOrgDialogOpen}
            trigger={
              <Button variant="secondary" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        <OrganizationAccessGate
          decision={access.decisions.manageOrganizationSettings}
          deniedMessage={t("You don't have permission to view organization settings.")}
          errorMessage={t("Failed to load organizations data. Please try again later.")}
          loadingMessage={t("Loading organization...")}
          noOrganizationMessage={t("You need to create or be added to an organization before you can manage members.")}
          onRetry={access.retry}
          retryLabel={t("Try Again")}
        >
          <div className="mt-6">{children}</div>
        </OrganizationAccessGate>
      </div>
    </>
  );
}
