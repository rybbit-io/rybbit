"use client";
import { DateTime } from "luxon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { authClient } from "../../../lib/auth";

// Import the separated dialog components
import { useOrganizationMembers } from "../../../api/admin/auth";
import {
  UserOrganization,
  useUserOrganizations,
} from "../../../api/admin/organizations";
import { NoOrganization } from "../../../components/NoOrganization";
import { AddMemberDialog } from "./components/AddMemberDialog";
import { DeleteOrganizationDialog } from "./components/DeleteOrganizationDialog";
import { EditOrganizationDialog } from "./components/EditOrganizationDialog";
import { RemoveMemberDialog } from "./components/RemoveMemberDialog";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";

// Types for our component
export type Organization = {
  id: string;
  name: string;
  createdAt: string;
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
function Organization({ org }: { org: UserOrganization }) {
  const { data: members, refetch } = useOrganizationMembers(org.id);

  // const { data: invitations, refetch: refetchInvitations } = useQuery({
  //   queryKey: ["invitations", org.id],
  //   queryFn: async () => {
  //     const invitations = await authClient.organization.listInvitations({
  //       query: {
  //         organizationId: org.id,
  //       },
  //     });

  //     if (invitations.error) {
  //       throw new Error(invitations.error.message);
  //     }

  //     return invitations.data;
  //   },
  // });

  const { data } = authClient.useSession();

  const isOwner = members?.data.find(
    (member) => member.role === "owner" && member.userId === data?.user?.id
  );

  const handleRefresh = () => {
    refetch();
    // refetchInvitations();
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl">
              {org.name}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({org.slug})
              </span>
            </CardTitle>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <AddMemberDialog
                    organizationId={org.id}
                    onSuccess={handleRefresh}
                  />
                  <EditOrganizationDialog
                    organization={org}
                    onSuccess={handleRefresh}
                  />
                  <DeleteOrganizationDialog
                    organization={org}
                    onSuccess={handleRefresh}
                  />
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
              {members?.data?.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user?.name || "—"}</TableCell>
                  <TableCell>{member.user?.email}</TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell>
                    {DateTime.fromSQL(member.createdAt).toLocaleString(
                      DateTime.DATE_SHORT
                    )}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      {member.role !== "owner" && (
                        <RemoveMemberDialog
                          member={member}
                          organizationId={org.id}
                          onSuccess={handleRefresh}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(!members?.data || members.data.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={isOwner ? 5 : 4}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Disabled for now. We aren't using this */}
      {/* 
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                {isOwner && <TableHead className="w-12">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations?.length && invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell className="capitalize">
                      {invitation.role}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invitation.status === "pending"
                            ? "outline"
                            : invitation.status === "accepted"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {DateTime.fromJSDate(
                        new Date(invitation.expiresAt)
                      ).toLocaleString(DateTime.DATE_SHORT)}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await authClient.organization.cancelInvitation({
                              invitationId: invitation.id,
                            });
                            refetchInvitations();
                          }}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isOwner ? 5 : 4}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No pending invitations
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card> */}
    </>
  );
}

// Main Organizations component
export default function Organizations() {
  useSetPageTitle("Rybbit · Organizations");
  const { data, isLoading } = useUserOrganizations();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">Loading organizations...</div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <NoOrganization message="You need to create or be added to an organization before you can manage your organizations." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {data?.map((organization) => (
        <Organization key={organization.id} org={organization} />
      ))}
    </div>
  );
}
