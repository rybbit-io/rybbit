"use client";

import { DateTime } from "luxon";
import { Pencil } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { GetOrganizationMembersResponse } from "../../../../api/admin/endpoints/auth";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { IS_CLOUD } from "../../../../lib/const";
import { getTimezone } from "../../../../lib/store";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditMemberDialog } from "./EditMemberDialog";
import { InviteMemberDialog } from "./InviteMemberDialog";

type MemberData = GetOrganizationMembersResponse["data"][0];

interface MembersTableProps {
  org: { id: string; name: string; slug: string; createdAt: Date };
  members: GetOrganizationMembersResponse | undefined;
  membersLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function MembersTable({
  org,
  members,
  membersLoading,
  isOwner,
  isAdmin,
  onRefresh,
}: MembersTableProps) {
  const t = useExtracted();
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);

  return (
    <>
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
                      onSuccess={onRefresh}
                      memberCount={members?.data?.length || 0}
                    />
                  ) : (
                    <CreateUserDialog organizationId={org.id} onSuccess={onRefresh} />
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
                {isAdmin && <TableHead className="w-12">{t("Actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersLoading ? (
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
                    {isAdmin && (
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
                        {member.role === "admin"
                          ? t("Admin")
                          : member.role === "owner"
                            ? t("Owner")
                            : t("Member")}
                      </TableCell>
                      <TableCell>
                        {member.role === "member" ? (
                          <Badge
                            variant={
                              member.siteAccess?.hasRestrictedSiteAccess ? "default" : "secondary"
                            }
                          >
                            {member.siteAccess?.hasRestrictedSiteAccess
                              ? t("{count} sites", {
                                  count: String(member.siteAccess.siteIds.length),
                                })
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
                            <Button
                              size="smIcon"
                              variant="ghost"
                              onClick={() => setSelectedMember(member)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!members?.data || members.data.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 6 : 5}
                        className="text-center py-6 text-muted-foreground"
                      >
                        {t("No members found")}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditMemberDialog
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        onSuccess={onRefresh}
        isOwner={isOwner}
      />
    </>
  );
}
