"use client";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useOrganizationMembers } from "../../../api/admin/hooks/useOrganizationMembers";
import { useOrganizationInvitations } from "../../../api/admin/hooks/useOrganizations";
import { NoOrganization } from "../../../components/NoOrganization";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { authClient } from "../../../lib/auth";
import { DeleteOrganizationDialog } from "./components/DeleteOrganizationDialog";
import { Invitations } from "./components/Invitations";
import { MembersTable } from "./components/MembersTable";

// Types for our component
export type Organization = {
  id: string;
  name: string;
  createdAt: Date;
  slug: string;
};

export type Member = {
  id: string;
  role: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  siteAccess?: {
    hasRestrictedSiteAccess: boolean;
    siteIds: number[];
  };
};

// Organization Component with Members Table
function Organization({
  org,
}: {
  org: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
}) {
  const t = useExtracted();
  const [name, setName] = useState(org.name);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setName(org.name);
  }, [org.name]);

  const { data: members, refetch, isLoading: membersLoading } = useOrganizationMembers(org.id);
  const { refetch: refetchInvitations } = useOrganizationInvitations(org.id);
  const { data } = authClient.useSession();

  const isOwner = !!members?.data.find(member => member.role === "owner" && member.userId === data?.user?.id);
  const isAdmin = !!members?.data.find(member => member.role === "admin" && member.userId === data?.user?.id) || isOwner;

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
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("Organization")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("Organization Name")}</h4>
              <p className="text-xs text-neutral-500">{t("Update your organization name")}</p>
              <div className="flex space-x-2">
                <Input id="name" value={name} onChange={({ target }) => setName(target.value)} placeholder="name" />
                <Button variant="outline" onClick={handleOrganizationNameUpdate} disabled={name === org.name}>
                  {isUpdating ? t("Updating...") : t("Update")}
                </Button>
              </div>
            </div>
            <div className="pt-4 border-t mt-4 space-y-2">
              <h4 className="text-sm font-medium">{t("Delete Organization")}</h4>
              <p className="text-xs text-neutral-500">{t("Permanently delete this organization and all its data")}</p>
              <div className="w-[200px]">
                <DeleteOrganizationDialog organization={org} onSuccess={handleRefresh} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <MembersTable
        org={org}
        members={members}
        membersLoading={membersLoading}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onRefresh={handleRefresh}
      />

      <Invitations organizationId={org.id} isOwner={isOwner} />
    </>
  );
}

// Main Organizations component
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

  return (
    <div className="flex flex-col gap-6">
      <Organization key={activeOrganization.id} org={activeOrganization} />
    </div>
  );
}
