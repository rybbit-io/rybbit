"use client";

import type { OrgRole } from "@rybbit/shared";
import { DateTime } from "luxon";
import { Pencil } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";

import { GetOrganizationMembersResponse } from "@/api/admin/endpoints/auth";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useTeams } from "@/api/admin/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/const";
import { useRoleInfo } from "@/lib/roles";
import { getTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";

import { LedgerSection, LedgerTable } from "../../components/Ledger";
import { PersonAvatar } from "../../components/PersonAvatar";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditMemberDialog } from "./EditMemberDialog";
import { type Invitation, InvitationRow } from "./Invitations";
import { InviteMemberDialog } from "./InviteMemberDialog";
import {
  PEOPLE_CELL,
  PEOPLE_HEAD,
  PEOPLE_ROW,
  PEOPLE_SECONDARY,
  PersonCell,
  SiteAccessSummary,
  YouMarker,
} from "./PeopleCells";
import { accessForPeople, invitationAccessKey } from "./personAccess";

type MemberData = GetOrganizationMembersResponse["data"][0];

interface PeopleTableProps {
  organizationId: string;
  members: MemberData[] | undefined;
  /** Pending invitations only. */
  invitations: Invitation[] | undefined;
  isLoading: boolean;
  /** Invite, edit and remove members, and resend or cancel invitations. */
  canManageMembers: boolean;
  /** Roles the current user may give; a member is editable only when their current role is one of them. */
  assignableRoles: OrgRole[];
  onRefresh: () => void;
  onInvitationsChanged: () => void;
}

/** Members and pending invitations in one table, under the People heading. */
export function PeopleTable({
  organizationId,
  members = [],
  invitations = [],
  isLoading,
  canManageMembers,
  assignableRoles,
  onRefresh,
  onInvitationsChanged,
}: PeopleTableProps) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();
  const { data: session } = authClient.useSession();
  const { data: sitesData, isError: sitesError } = useGetSitesFromOrg(organizationId);
  const { data: teamsData, isError: teamsError } = useTeams(organizationId);
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [query, setQuery] = useState("");

  // Who reaches which sites depends on every team and grant in the organization, so it's worked out
  // for everyone at once.
  const accessByKey = useMemo(
    () => sitesData && teamsData && accessForPeople(sitesData.sites, members, invitations, teamsData.teams),
    [sitesData, teamsData, members, invitations]
  );
  const accessOf = (key: string) => (sitesError || teamsError ? null : accessByKey ? accessByKey.get(key) : undefined);

  const canEditMember = (member: MemberData) => assignableRoles.some(role => role === member.role);
  // Invitations are emailed on cloud only, and resending needs the right to give the invited role.
  const canResend = (invitation: Invitation) =>
    IS_CLOUD && canManageMembers && assignableRoles.some(role => role === invitation.role);

  const needle = query.trim().toLowerCase();
  const matches = (...values: (string | null | undefined)[]) =>
    !needle || values.some(value => value?.toLowerCase().includes(needle));
  const shownMembers = members.filter(member => matches(member.user.name, member.user.email));
  const shownInvitations = invitations.filter(invitation => matches(invitation.email));
  const columnCount = canManageMembers ? 5 : 4;

  const summary =
    invitations.length > 0
      ? t("{people, plural, one {# person} other {# people}} · {invited} invited", {
          people: members.length,
          invited: String(invitations.length),
        })
      : t("{people, plural, one {# person} other {# people}}", { people: members.length });

  return (
    <LedgerSection
      title={t("People")}
      description={isLoading ? undefined : summary}
      actions={
        <>
          <div className="w-[180px] sm:w-[220px]">
            <Input
              isSearch
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t("Search people")}
              aria-label={t("Search people")}
              className="h-8 text-sm"
            />
          </div>
          {canManageMembers &&
            (IS_CLOUD ? (
              <InviteMemberDialog
                organizationId={organizationId}
                onSuccess={onRefresh}
                memberCount={members.length}
                assignableRoles={assignableRoles}
              />
            ) : (
              <CreateUserDialog
                organizationId={organizationId}
                onSuccess={onRefresh}
                assignableRoles={assignableRoles}
              />
            ))}
        </>
      }
    >
      <LedgerTable>
        <Table className="min-w-[680px]">
          <TableHeader className="bg-transparent dark:bg-transparent [&_tr]:border-b">
            <TableRow className={PEOPLE_ROW}>
              <TableHead className={PEOPLE_HEAD}>{t("Person")}</TableHead>
              <TableHead className={PEOPLE_HEAD}>{t("Role")}</TableHead>
              <TableHead className={PEOPLE_HEAD}>{t("Site access")}</TableHead>
              <TableHead className={PEOPLE_HEAD}>{t("Joined")}</TableHead>
              {canManageMembers && (
                <TableHead className={cn(PEOPLE_HEAD, "w-12")}>
                  <span className="sr-only">{t("Actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-transparent dark:bg-transparent">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`loading-${index}`} className={PEOPLE_ROW}>
                  <TableCell className={PEOPLE_CELL}>
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted"></div>
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-24 animate-pulse rounded bg-muted"></div>
                        <div className="h-3 w-32 animate-pulse rounded bg-muted"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={PEOPLE_CELL}>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
                  </TableCell>
                  <TableCell className={PEOPLE_CELL}>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                  </TableCell>
                  <TableCell className={PEOPLE_CELL}>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                  </TableCell>
                  {canManageMembers && <TableCell className={PEOPLE_CELL}></TableCell>}
                </TableRow>
              ))
            ) : members.length === 0 && invitations.length === 0 ? (
              <TableRow className={PEOPLE_ROW}>
                <TableCell colSpan={columnCount} className="py-6 text-center text-neutral-500 dark:text-neutral-400">
                  {t("No members found")}
                </TableCell>
              </TableRow>
            ) : shownMembers.length === 0 && shownInvitations.length === 0 ? (
              <TableRow className={PEOPLE_ROW}>
                <TableCell colSpan={columnCount} className="py-6 text-center text-neutral-500 dark:text-neutral-400">
                  {t("No one matches “{query}”", { query: query.trim() })}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {shownMembers.map(member => (
                  <TableRow key={member.id} className={PEOPLE_ROW}>
                    <TableCell className={PEOPLE_CELL}>
                      <PersonCell
                        avatar={<PersonAvatar person={member.user} size="md" />}
                        name={member.user.name || member.user.email}
                        marker={member.userId === session?.user.id ? <YouMarker /> : undefined}
                        detail={member.user.name ? member.user.email : undefined}
                      />
                    </TableCell>
                    <TableCell className={cn(PEOPLE_CELL, PEOPLE_SECONDARY)}>{roleInfo(member.role).label}</TableCell>
                    <TableCell className={cn(PEOPLE_CELL, PEOPLE_SECONDARY)}>
                      <SiteAccessSummary access={accessOf(member.userId)} />
                    </TableCell>
                    <TableCell className={cn(PEOPLE_CELL, "whitespace-nowrap tabular-nums")}>
                      {DateTime.fromSQL(member.createdAt, { zone: "utc" })
                        .setZone(getTimezone())
                        .toLocaleString(DateTime.DATE_MED)}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell className={cn(PEOPLE_CELL, "text-right")}>
                        {canEditMember(member) && (
                          <Button
                            size="smIcon"
                            variant="ghost"
                            className="-mr-1.5 text-neutral-500 dark:text-neutral-400"
                            aria-label={t("Edit {name}", { name: member.user.name || member.user.email })}
                            onClick={() => setSelectedMember(member)}
                          >
                            <Pencil />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {shownInvitations.map(invitation => {
                  const inviter = members.find(member => member.userId === invitation.inviterId);
                  return (
                    <InvitationRow
                      key={invitation.id}
                      invitation={invitation}
                      inviterName={inviter ? inviter.user.name || inviter.user.email : undefined}
                      access={accessOf(invitationAccessKey(invitation))}
                      canManage={canManageMembers}
                      canResend={canResend(invitation)}
                      onChanged={onInvitationsChanged}
                    />
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </LedgerTable>

      <EditMemberDialog
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        onSuccess={onRefresh}
        assignableRoles={assignableRoles}
      />
    </LedgerSection>
  );
}
