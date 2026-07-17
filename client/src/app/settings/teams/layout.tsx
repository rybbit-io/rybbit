"use client";

import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useUserOrganizations } from "../../../api/admin/hooks/useOrganizations";
import { Button } from "../../../components/ui/button";
import { useActiveOrganizationId } from "../../../hooks/useActiveOrganizationId";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";
import { ExternalLink } from "../../../components/ExternalLink";

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  // The user's role comes from /user/organizations rather than the heavy
  // get-full-organization call, so the permission gate resolves reliably.
  const activeOrganizationId = useActiveOrganizationId();
  const { data: organizations } = useUserOrganizations();
  const currentMember = organizations?.find(org => org.id === activeOrganizationId);
  const isMember = currentMember?.role === "member";

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
        {!isMember && (
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

      {isMember ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center text-neutral-500 dark:text-neutral-400">
          {t("You don't have permission to view team settings.")}
        </div>
      ) : (
        <div className="mt-6">{children}</div>
      )}
    </div>
  );
}
