"use client";

import { DateTime } from "luxon";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";

import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useOrganizationInvitations } from "@/api/admin/hooks/useOrganizations";
import { CopyText } from "@/components/CopyText";
import { NoOrganization } from "@/components/NoOrganization";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useOrgPermissions } from "@/hooks/usePermissions";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { getTimezone } from "@/lib/store";

import { ApiKeyManager } from "../account/components/ApiKeyManager";
import { DangerRow, DangerZone, LedgerRow, LedgerRows, LedgerSaveBar, LedgerSection } from "../components/Ledger";
import { DeleteOrganizationDialog, useHasActiveSubscription } from "./components/DeleteOrganizationDialog";
import { PeopleTable } from "./components/PeopleTable";

export type Organization = {
  id: string;
  name: string;
  createdAt: Date;
  slug: string;
};

function Organization({ org }: { org: Organization }) {
  const t = useExtracted();
  const [name, setName] = useState(org.name);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setName(org.name);
  }, [org.name]);

  const { data: members, refetch, isLoading: membersLoading } = useOrganizationMembers(org.id);
  const {
    data: invitations,
    refetch: refetchInvitations,
    isLoading: invitationsLoading,
  } = useOrganizationInvitations(org.id);
  const { can, assignableRoles } = useOrgPermissions(org.id);
  const hasActiveSubscription = useHasActiveSubscription();
  const canRename = can("org:rename");
  const canDelete = can("org:delete");
  const isNameDirty = canRename && name !== org.name;

  const handleRefresh = () => {
    refetch();
    refetchInvitations();
  };

  const handleOrganizationNameUpdate = async () => {
    if (!name) {
      toast.error(t("Organization name cannot be empty"));
      return;
    }

    try {
      setIsUpdating(true);
      const response = await authClient.organization.update({
        organizationId: org.id,
        data: {
          name,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || t("Failed to update organization name"));
      }

      toast.success(t("Name updated successfully"));
      window.location.reload();
    } catch (error) {
      console.error("Error updating organization name:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update organization name"));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <LedgerSection title={t("General")}>
        <LedgerRows>
          <LedgerRow
            label={t("Name")}
            description={t("Shown in the nav and on invitations.")}
            htmlFor={canRename ? "organization-name" : undefined}
          >
            {canRename ? (
              <>
                <Input
                  id="organization-name"
                  value={name}
                  onChange={({ target }) => setName(target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && isNameDirty && !isUpdating) handleOrganizationNameUpdate();
                  }}
                  autoComplete="off"
                  className="md:max-w-[340px]"
                />
                {isNameDirty && (
                  <p className="mt-1 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                    {t.rich("Was <old>{name}</old>", {
                      name: org.name,
                      old: chunks => (
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{chunks}</span>
                      ),
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="flex min-h-9 items-center text-sm">{org.name}</p>
            )}
          </LedgerRow>
          <LedgerRow label={t("Slug")} description={t("Set at creation. It can't be changed.")}>
            <div className="flex min-h-9 items-center">
              <CopyText text={org.slug} className="text-neutral-700 dark:text-neutral-300" />
            </div>
          </LedgerRow>
          <LedgerRow label={t("Created")}>
            <p className="flex min-h-9 items-center text-sm tabular-nums">
              {DateTime.fromJSDate(new Date(org.createdAt)).setZone(getTimezone()).toLocaleString(DateTime.DATE_MED)}
            </p>
          </LedgerRow>
        </LedgerRows>
        <LedgerSaveBar
          dirty={isNameDirty}
          saving={isUpdating}
          onCancel={() => setName(org.name)}
          onSave={handleOrganizationNameUpdate}
        />
      </LedgerSection>

      <PeopleTable
        organizationId={org.id}
        members={members?.data}
        invitations={invitations?.filter(invitation => invitation.status === "pending")}
        isLoading={membersLoading || invitationsLoading}
        canManageMembers={can("members:manage")}
        assignableRoles={assignableRoles}
        onRefresh={handleRefresh}
        onInvitationsChanged={refetchInvitations}
      />

      {can("apikeys:manage") && <ApiKeyManager organizationId={org.id} />}

      {canDelete && (
        <DangerZone>
          <DangerRow
            label={t("Delete organization")}
            description={t("Permanent. There is no undo.")}
            consequence={
              <>
                {t(
                  "Deletes {name} and all its data, including its teams and organization API keys, and removes all its members.",
                  { name: org.name }
                )}
                {hasActiveSubscription && (
                  <>
                    {" "}
                    {t.rich("Cancel your subscription in <link>Billing</link> first.", {
                      link: chunks => (
                        <Link
                          href="/settings/billing"
                          className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-50"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </>
                )}
              </>
            }
            action={<DeleteOrganizationDialog organization={org} onSuccess={handleRefresh} />}
          />
        </DangerZone>
      )}
    </>
  );
}

export default function MembersPage() {
  useSetPageTitle("Organization Members");
  const t = useExtracted();
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">{t("Loading organization...")}</div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <NoOrganization message={t("You need to create or be added to an organization before you can manage members.")} />
    );
  }

  return <Organization key={activeOrganization.id} org={activeOrganization} />;
}
