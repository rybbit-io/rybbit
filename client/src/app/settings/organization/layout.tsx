"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useUserOrganizations } from "../../../api/admin/hooks/useOrganizations";
import { CreateOrganizationDialog } from "../../../components/CreateOrganizationDialog";
import { OrganizationSelector } from "../../../components/OrganizationSelector";
import { Button } from "../../../components/ui/button";
import { useActiveOrganizationId } from "../../../hooks/useActiveOrganizationId";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  const t = useExtracted();
  // The current user's role comes from /user/organizations rather than the
  // heavy get-full-organization call, so the permission gate resolves reliably.
  const activeOrganizationId = useActiveOrganizationId();
  const { data: organizations } = useUserOrganizations();
  const currentMember = organizations?.find(org => org.id === activeOrganizationId);
  const isMember = currentMember?.role === "member";

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

        {isMember ? (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center text-neutral-500 dark:text-neutral-400">
            {t("You don't have permission to view organization settings.")}
          </div>
        ) : (
          <>
            <div className="mt-6">{children}</div>
          </>
        )}
      </div>
    </>
  );
}
