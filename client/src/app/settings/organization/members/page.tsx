"use client";
import { DateTime } from "luxon";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { authClient } from "../../../../lib/auth";

import { useOrganizationMembers } from "../../../../api/admin/auth";
import { useOrganizationInvitations } from "../../../../api/admin/organizations";
import { NoOrganization } from "../../../../components/NoOrganization";
import { InviteMemberDialog } from "./components/InviteMemberDialog";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { EditOrganizationDialog } from "./components/EditOrganizationDialog";
import { DeleteOrganizationDialog } from "./components/DeleteOrganizationDialog";
import { RemoveMemberDialog } from "./components/RemoveMemberDialog";
import { Invitations } from "./components/Invitations";
import { IS_CLOUD } from "../../../../lib/const";
import { CreateUserDialog } from "./components/CreateUserDialog";

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
    image: string | null;
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
  const { data: members, refetch, isLoading: membersLoading } = useOrganizationMembers(org.id);
  const { refetch: refetchInvitations } = useOrganizationInvitations(org.id);
  const { data } = authClient.useSession();

  const isOwner = members?.data.find((member) => member.role === "owner" && member.userId === data?.user?.id);

  const handleRefresh = () => {
    refetch();
    refetchInvitations();
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl">Members</CardTitle>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  {IS_CLOUD ? (
                    <InviteMemberDialog organizationId={org.id} onSuccess={handleRefresh} />
                  ) : (
                    <CreateUserDialog organizationId={org.id} onSuccess={handleRefresh} />
                  )}
                  <EditOrganizationDialog organization={org} onSuccess={handleRefresh} />
                  <DeleteOrganizationDialog organization={org} onSuccess={handleRefresh} />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isOwner && <TableHead className="w-12">Actions</TableHead>}
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
                  {members?.data?.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user?.name || "—"}</TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell className="capitalize">{member.role}</TableCell>
                      <TableCell>
                        {DateTime.fromSQL(member.createdAt, { zone: "utc" })
                          .toLocal()
                          .toLocaleString(DateTime.DATE_SHORT)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right">
                          {member.role !== "owner" && (
                            <RemoveMemberDialog member={member} organizationId={org.id} onSuccess={handleRefresh} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!members?.data || members.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 5 : 4} className="text-center py-6 text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Invitations organizationId={org.id} isOwner={!!isOwner} />
    </>
  );
}

// Main Organizations component
export default function MembersPage() {
  useSetPageTitle("Rybbit · Organization Members");
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">Loading organization...</div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <NoOrganization message="You need to create or be added to an organization before you can manage members." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Organization key={activeOrganization.id} org={activeOrganization} />
    </div>
  );
}
