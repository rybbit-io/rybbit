"use client";
import { DateTime } from "luxon";
import { getTimezone } from "../../../../lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Badge } from "../../../../components/ui/badge";
import { authClient } from "../../../../lib/auth";

import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useOrganizationMembers } from "../../../../api/admin/hooks/useOrganizationMembers";
import { useOrganizationInvitations } from "../../../../api/admin/hooks/useOrganizations";
import { NoOrganization } from "../../../../components/NoOrganization";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { IS_CLOUD } from "../../../../lib/const";
import { CreateUserDialog } from "./components/CreateUserDialog";
import { DeleteOrganizationDialog } from "./components/DeleteOrganizationDialog";
import { Invitations } from "./components/Invitations";
import { InviteMemberDialog } from "./components/InviteMemberDialog";
import { MemberSiteAccessDialog } from "./components/MemberSiteAccessDialog";
import { RemoveMemberDialog } from "./components/RemoveMemberDialog";
import { GetOrganizationMembersResponse } from "../../../../api/admin/endpoints/auth";

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
type MemberData = GetOrganizationMembersResponse["data"][0];

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
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState<MemberData | null>(null);

  useEffect(() => {
    setName(org.name);
  }, [org.name]);

  const { data: members, refetch, isLoading: membersLoading } = useOrganizationMembers(org.id);
  const { refetch: refetchInvitations } = useOrganizationInvitations(org.id);
  const { data } = authClient.useSession();

  const isOwner = members?.data.find(member => member.role === "owner" && member.userId === data?.user?.id);
  const isAdmin = members?.data.find(member => member.role === "admin" && member.userId === data?.user?.id) || isOwner;

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
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl">{t("Members")}</CardTitle>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  {IS_CLOUD ? (
                    <InviteMemberDialog
                      organizationId={org.id}
                      onSuccess={handleRefresh}
                      memberCount={members?.data?.length || 0}
                    />
                  ) : (
                    <CreateUserDialog organizationId={org.id} onSuccess={handleRefresh} />
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Email")}</TableHead>
                <TableHead>{t("Role")}</TableHead>
                <TableHead>{t("Site Access")}</TableHead>
                <TableHead>{t("Joined")}</TableHead>
                {isOwner && <TableHead className="w-12">{t("Actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersLoading ? (
                // Loading skeleton rows
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <div className="h-8 bg-muted animate-pulse rounded w-16 ml-auto"></div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <>
                  {members?.data?.map((member: MemberData) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.name || "—"}</TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell className="capitalize">
                        {member.role === "admin" ? t("Admin") : member.role === "owner" ? t("Owner") : t("Member")}
                      </TableCell>
                      <TableCell>
                        {member.role === "member" ? (
                          <Badge
                            variant={member.siteAccess?.hasRestrictedSiteAccess ? "default" : "secondary"}
                            className={isAdmin ? "cursor-pointer hover:opacity-80" : ""}
                            onClick={() => isAdmin && setSelectedMemberForAccess(member)}
                          >
                            {member.siteAccess?.hasRestrictedSiteAccess
                              ? t("{count} sites", { count: String(member.siteAccess.siteIds.length) })
                              : t("All sites")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("All sites")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {DateTime.fromSQL(member.createdAt, { zone: "utc" })
                          .setZone(getTimezone())
                          .toLocaleString(DateTime.DATE_SHORT)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {(isOwner || member.role !== "owner") && (
                            <RemoveMemberDialog member={member} organizationId={org.id} onSuccess={handleRefresh} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!members?.data || members.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 6 : 5} className="text-center py-6 text-muted-foreground">
                        {t("No members found")}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>

          {/* Member Site Access Dialog */}
          <MemberSiteAccessDialog
            member={selectedMemberForAccess}
            open={!!selectedMemberForAccess}
            onClose={() => setSelectedMemberForAccess(null)}
            onSuccess={handleRefresh}
          />
        </CardContent>
      </Card>

      <Invitations organizationId={org.id} isOwner={!!isOwner} />
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
